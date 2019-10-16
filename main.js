#!/usr/bin/env node
const Sqrl = require('squirrelly');
const {transformFileAsync: transform} = require("@babel/core");
const fs = require('fs');

const yargs = require('yargs');

const {readFile, mkdir, writeFile: wf, access, copyFile: cf} = fs.promises;

const writeFile = (...args) => {
        const [path, message] = args;
        console.log(`witting file to: ${path} - size ${message.length}B`);
        return wf(...args);
    },
    copyFile = (...args) => {
        const [from, to] = args;
        console.log(`copying file from: ${from} - to ${to}`);
        return cf(...args);
    };


const exists = (file) => access(file).then(() => true).catch(() => false);


const argv = yargs
    .option('src', {
        alias: 's',
        default: 'src',
        description: 'Path to source files',
        type: 'string',
    })
    .option('title', {
        alias: 't',
        default: 'No Title',
        desc: 'Set the page title',
        type: 'string'
    })
    .option('dest', {
        alias: 'd',
        default: 'dist',
        description: 'Path to output files',
        type: 'string',
    })
    .showHelpOnFail(true)
    .help()
    .argv;

(async ({src, title, dest: dir}) => {

    if (!src.match(/\/$/))
        src = src + '/';

    if (!await exists(src)) {
        console.log(new Error("source folder missing !"));
        process.exit(-1);
        return;
    }

    let html = await exists(`${src}index.html`).then(async (b) => {
        if (!b) return "";
        const partial = await readFile(`${src}index.html`);

        Sqrl.definePartial('index.partial.html', partial);

        return Sqrl.renderFile(__dirname + "/template.html", {title});
    });

    const [jsMin, js] = await exists(`${src}script.js`).then((b) => b ? Promise.all([
        transform(`${src}script.js`, {
                "plugins": ["remove-import-export"],
                "presets": [
                    "@babel/preset-env", "minify"
                ],
                "sourceMaps": "inline"
            }
        ).then(r => r.code),
        transform(`${src}script.js`, {
                "plugins": ["remove-import-export"],
                "presets": [
                    "@babel/preset-env"
                ],
                "sourceMaps": "inline"
            }
        ).then(r => r.code)
    ]) : false);

    await exists(dir).then((b) => b ? false : mkdir(dir));

    const taskStyle = exists(`${src}style.css`).then(result => result ?
        copyFile(`${src}style.css`, `${dir}/style.css`) :
        writeFile(`${dir}/style.css`, "")
    );

    await Promise.all([
            writeFile(`${dir}/index.html`, html),
            writeFile(`${dir}/script.min.js`, jsMin),
            writeFile(`${dir}/script.js`, js),
            taskStyle
        ]
    );

})(argv);

