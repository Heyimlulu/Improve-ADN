const fs = require('fs');
const archiver = require('archiver');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;

const outputDir = 'dist';
const outputFilename = `adn-improver-v${version}.zip`;

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const output = fs.createWriteStream(`${outputDir}/${outputFilename}`);
const archive = archiver('zip', {
    zlib: { level: 9 }
});

output.on('close', function() {
    console.log(`Successfully created ${outputFilename}`);
    console.log(archive.pointer() + ' total bytes');
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

archive.file('manifest.json', { name: 'manifest.json' });
archive.directory('icons/', 'icons');
archive.directory('popup/', 'popup');
archive.directory('content/', 'content');

archive.finalize();
