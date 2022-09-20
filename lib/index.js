// Makes sure all dependencies for webpack and js compilation are installed.
const Compilation = require('webpack').Compilation;
const fs = require('fs');

class SourceMapReferenceRemover {
    constructor(opts) {
        console.log("Unblu SourceMapReferenceRemover (v1.0.4) created");
        this.options = Object.assign({jsFileWithSourceMapRefSuffix: '.sm.min.js', targetFileSuffix: '.min.js'}, opts);
    }

    apply(compiler) {
        compiler.hooks.compilation.tap("SourceMapReferenceRemover", (compilation) => {
            compilation.hooks.afterProcessAssets.tap({ name: 'SourceMapReferenceRemover', stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING, additionalAssets: true }, (assets) => {
                const outputPath = compilation.compiler.outputPath;
                Object.keys(assets).forEach((file) => {
                    if (file.match("^[^\\.]+" + this.options.targetFileSuffix + "\\.map$")) {
                        compilation.deleteAsset(file);
                        return;
                    }

                    if (file.endsWith(this.options.jsFileWithSourceMapRefSuffix)) {
                        this.info(`Processing ${file}`);

                        const asset = compilation.assets[file];
                        // Get the content of the file
                        const originalSource = asset.source();
                        const originalSourceAndMap = asset.sourceAndMap();

                        // remove source map url reference
                        const adjustedSource = originalSource.replaceAll(/^\/\/# sourceMappingURL=.*$/mg, "");
                        let adjustedSourceAndMap = undefined;
                        if (originalSourceAndMap) {
                            adjustedSourceAndMap = {...originalSourceAndMap};
                            adjustedSourceAndMap.source = originalSourceAndMap.source.replaceAll(/^\/\/# sourceMappingURL=.*$/mg, "");
                        }

                        const targetFile = outputPath + file.replace(this.options.jsFileWithSourceMapRefSuffix, this.options.targetFileSuffix);
                        this.info(`Writing file ${targetFile}`);
                        // fs.writeFileSync(targetFile, adjustedSource);
                        compilation.assets[file.replace(this.options.jsFileWithSourceMapRefSuffix, this.options.targetFileSuffix)] = {
                            source: () => adjustedSource,
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
}

module.exports = SourceMapReferenceRemover;
