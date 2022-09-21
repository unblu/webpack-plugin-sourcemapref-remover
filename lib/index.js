// Makes sure all dependencies for webpack and js compilation are installed.
const Compilation = require('webpack').Compilation;
const fs = require('fs');
const {version} = require('../package.json');

class SourceMapReferenceRemover {
    constructor(opts) {
        console.log(`Unblu SourceMapReferenceRemover (v${version}) created`);
        this.options = Object.assign({jsFileWithSourceMapRefSuffix: '.sm.min.js', targetFileSuffix: '.min.js'}, opts);
    }

    apply(compiler) {
        compiler.hooks.compilation.tap("SourceMapReferenceRemover", (compilation) => {
            compilation.hooks.afterProcessAssets.tap({ name: 'SourceMapReferenceRemover', stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING, additionalAssets: true }, (assets) => {
                const outputPath = compilation.compiler.outputPath;
                Object.keys(assets).forEach((file) => {
                    // this is special. The following lines are only required, because in a first run our webpack plugin produced new javascript assets
                    // that do not contain a sourcemap reference anymore. However, the default webpack dev tool will trigger again and produce
                    // source maps for those files again. These lines delete those additional map files.
                    if (file.match("^[^\\.]+" + this.options.targetFileSuffix + "\\.map$")) {
                        compilation.deleteAsset(file);
                        return;
                    }

                    if (file.endsWith(this.options.jsFileWithSourceMapRefSuffix)) {
                        this.info(`Processing ${file}`);

                        const asset = compilation.assets[file];
                        // Get the content of the file
                        const originalSourceAndMap = asset.sourceAndMap();
                        if (!originalSourceAndMap || !originalSourceAndMap.source) {
                            this.warn(`Source map not available for ${file}. Skipping. May be coming up again later in the compile process.`);
                            return;
                        }

                        // remove source map url reference
                        const adjustedSourceAndMap = {...originalSourceAndMap};
                        this.info(`originalSourceAndMap.source type: ${typeof originalSourceAndMap.source}`);
                        adjustedSourceAndMap.source = originalSourceAndMap.source.replaceAll(/^\/\/# sourceMappingURL=.*$/mg, "");

                        const targetFile = file.replace(this.options.jsFileWithSourceMapRefSuffix, this.options.targetFileSuffix);
                        this.info(`Writing file ${outputPath + targetFile}`);
                        compilation.assets[targetFile] = {
                            source: () => adjustedSourceAndMap.source,
                            sourceAndMap: () => adjustedSourceAndMap,
                        };
                    }
                });
            });
        });
    }

    info(message) {
        console.log(`Unblu SourceMapReferenceRemover ${message}`);
    }

    warn(message) {
        console.warn(`Unblu SourceMapReferenceRemover ${message}`);
    }
}

module.exports = SourceMapReferenceRemover;
