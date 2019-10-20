import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const iife = {
    input: './index.mjs',
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
    input: './index.mjs',
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



// // import de nos plugins
// import commonjs from 'rollup-plugin-commonjs';
// import resolve from 'rollup-plugin-node-resolve';
// import babel from 'rollup-plugin-babel';
// import { terser } from 'rollup-plugin-terser';


// export default {
//     input: './index.mjs',

//     plugins: [
//         commonjs(), // prise en charge de require
//         resolve(), // prise en charge des modules depuis node_modules
//         babel(), // transpilation
//         terser() // minification
//     ],
//     output: [
//         {
//             format: 'cjs',
//             file: './index.min.js'
//         },
        
//         {
//             format: 'iife',
//             file: '../../src/assets/osmToOsmgo.min.js',
//             name: 'osmToOsmgo'
//         }
//     ]
// };