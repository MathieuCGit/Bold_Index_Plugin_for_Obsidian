import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';

const banner = `/*\nTHIS FILE IS BUNDLED BY ESBUILD - source: main.ts\n*/\n`;

const prod = (process.argv[2] === 'production');

const ctx = await esbuild.context({
  banner: { js: banner },
  entryPoints: ['main.ts'],
  bundle: true,
  external: [
    'obsidian',
    ...builtins
  ],
  format: 'cjs',
  target: 'es2018',
  outfile: 'main.js',
  minify: prod,
  sourcemap: !prod,
  logLevel: 'info'
});

if (prod) {
  await ctx.rebuild();
  await ctx.dispose();
  process.exit(0);
} else {
  console.log('Starting esbuild watch (ctrl+c to exit)');
  await ctx.watch();
}
