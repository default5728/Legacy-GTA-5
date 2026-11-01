"""Deployment safety tests. No real service, database or production directory is touched."""
from pathlib import Path
import contextlib, importlib.util, io, json, shutil, tempfile, unittest, os, stat
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('legacy_deploy', Path(__file__).with_name('deploy.py'))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.base = Path(tempfile.mkdtemp(prefix='legacy-deploy-test-')).resolve()
        self.patches = []
        for key, child in [('ROOT', 'live'), ('STATE', 'state'), ('CHECKOUT', 'repo'), ('BACKUPS', 'backups')]:
            path = self.base / child
            path.mkdir()
            item = patch.object(d, key, path)
            item.start()
            self.patches.append(item)
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()

    def tearDown(self):
        self.output.__exit__(None, None, None)
        for item in reversed(self.patches):
            item.stop()
        assert self.base.name.startswith('legacy-deploy-test-')
        assert self.base.is_relative_to(Path(tempfile.gettempdir()).resolve())
        def remove_readonly(function, name, error):
            target=Path(name).resolve()
            assert target.is_relative_to(self.base)
            os.chmod(target, stat.S_IREAD|stat.S_IWRITE)
            function(name)
        shutil.rmtree(self.base,onexc=remove_readonly)

    def write(self, root, name, content):
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def fixture(self):
        a, b, gone = 'packages/server/a.js', 'client_packages/b.js', 'client_packages/gone.js'
        old_a = self.write(d.ROOT, a, b'old-a')
        old_gone = self.write(d.ROOT, gone, b'old-gone')
        self.write(d.CHECKOUT, a, b'new-a')
        self.write(d.CHECKOUT, b, b'new-b')
        state = {'commit': '1'*40, 'files': {a: d.digest(old_a), gone: d.digest(old_gone)}}
        d.atomic_json(d.STATE/'installed.json', state)
        files = {n: d.digest(d.CHECKOUT/n) for n in [a, b]}
        return a, b, gone, state, files

    def mock_copy(self, source, target):
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    def test_noncanonical_old_git_newlines_do_not_create_false_local_edits(self):
        import subprocess
        def git(*args, data=None):
            return subprocess.run(['git','-C',str(d.CHECKOUT),*args],input=data,capture_output=True,check=True).stdout
        git('init','--quiet')
        self.write(d.CHECKOUT,'.gitattributes',b'*.js text eol=lf\n')
        git('add','.gitattributes')
        name='packages/server/old.js'
        content=b'console.log(1);\r\n'
        self.write(d.CHECKOUT,name,content)
        blob=git('hash-object','-w','--stdin',data=content).decode().strip()
        git('update-index','--add','--cacheinfo','100644',blob,name)
        git('-c','user.name=Deployment Test','-c','user.email=test@localhost','-c','commit.gpgsign=false','commit','--quiet','-m','Old noncanonical blob')
        d.configure_checkout()
        self.assertEqual(git('status','--porcelain').strip(),b'')
        self.assertEqual((d.CHECKOUT/name).read_bytes(),content)

    def test_protected_and_escape_paths(self):
        for name in ['../stage.env', 'client_packages/../stage.env', 'client_packages/game_resources/a.rpf',
                     'packages/server/.env', 'packages/server/discord_admin/config.json', 'packages/server/node_modules/x.js',
                     'client_packages/x.dll', 'packages/server/data/users.json']:
            self.assertFalse(d.eligible_name(name), name)
        self.assertTrue(d.eligible_name('packages/server/feature.js'))

    def test_newline_only_changes_do_not_restart(self):
        name = 'packages/server/a.js'
        old = self.write(d.ROOT, name, b'console.log(1);\r\n')
        new = self.write(d.CHECKOUT, name, b'console.log(1);\n')
        self.assertEqual(d.plan({name: d.digest(new)}, {name: d.digest(old)}), ([], []))
        self.assertEqual(d.live_manifest({name: ''})[name], d.digest(old))

    def test_manual_live_edit_is_preserved(self):
        a, _, _, state, files = self.fixture()
        (d.ROOT/a).write_text('manual live fix')
        with self.assertRaisesRegex(ValueError, 'edited outside Git'):
            d.plan(files, state['files'])
        self.assertEqual((d.ROOT/a).read_text(), 'manual live fix')

    def test_success_and_deletions(self):
        a, b, gone, _, files = self.fixture()
        actions = []
        with patch.object(d, 'copy_live', self.mock_copy), patch.object(d, 'service', actions.append), patch.object(d, 'healthy', return_value=True), patch.object(d, 'database_backup', lambda path: (path/'database-before.sql').write_text('test backup')):
            d.install('2'*40, files)
        self.assertEqual(actions, ['stop', 'start'])
        self.assertEqual((d.ROOT/a).read_bytes(), b'new-a')
        self.assertTrue((d.ROOT/b).exists())
        self.assertFalse((d.ROOT/gone).exists())
        self.assertEqual(d.read_json(d.STATE/'installed.json', {})['commit'], '2'*40)
        self.assertEqual(len(list(d.BACKUPS.glob('*/database-before.sql'))), 1)

    def test_failed_boot_rolls_code_back_without_restoring_database(self):
        a, b, gone, state, files = self.fixture()
        actions = []
        with patch.object(d, 'copy_live', self.mock_copy), patch.object(d, 'service', actions.append), patch.object(d, 'healthy', side_effect=[False, True]), patch.object(d, 'database_backup', lambda path: (path/'database-before.sql').write_text('test backup')):
            with self.assertRaises(RuntimeError):
                d.install('3'*40, files)
        self.assertEqual(actions, ['stop', 'start', 'stop', 'start'])
        self.assertEqual((d.ROOT/a).read_bytes(), b'old-a')
        self.assertFalse((d.ROOT/b).exists())
        self.assertEqual((d.ROOT/gone).read_bytes(), b'old-gone')
        self.assertEqual(d.read_json(d.STATE/'installed.json', {}), state)
        self.assertEqual(d.read_json(d.STATE/'status.json', {})['status'], 'rolled_back')

    def test_unchanged_code_only_advances_commit_without_restart(self):
        name = 'packages/server/a.js'
        path = self.write(d.ROOT, name, b'unchanged')
        self.write(d.CHECKOUT, name, b'unchanged')
        with patch.object(d, 'service', side_effect=AssertionError('must not restart')):
            d.install('4'*40, {name: d.digest(path)})
        self.assertEqual(d.read_json(d.STATE/'status.json', {})['status'], 'installed_without_restart')

    def test_invalid_javascript_is_rejected_before_install(self):
        name = 'packages/server/broken.js'
        path = self.write(d.CHECKOUT, name, b'function (')
        with self.assertRaisesRegex(ValueError, 'JavaScript syntax error'):
            d.validate({name: d.digest(path)})
        self.assertFalse((d.ROOT/name).exists())


if __name__ == '__main__':
    unittest.main()
