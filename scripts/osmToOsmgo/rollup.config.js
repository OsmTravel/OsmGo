import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const iife = {
    input: './index.js',
    output: {
        format: 'iife',
        file: '../../src/assets/osmToOsmgo.min.js',
        name: 'osmToOsmgo'
    },
    plugins: [
        commonjs(),
        resolve(),
        babel(),
        terser()
    ]
};

const cjs = {
    input: './index.js',
    output: {
        format: 'cjs',
        file: './index.min.js'
    },
    plugins: [
        commonjs(),
        resolve(),
        babel(),
        terser()
    ]
};

const conf = process.env.BABEL_ENV === 'cjs' ? cjs : iife;
export default conf;