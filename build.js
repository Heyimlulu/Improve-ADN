/**
 * ADN Improver Build Script
 * Creates a production-ready zip file for the browser extension
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const CONFIG = {
    outputDir: 'dist',
    manifestFile: 'manifest.json',
    requiredDirectories: ['icons', 'popup', 'content'],
    optionalDirectories: ['shared'],
    requiredFiles: ['manifest.json'],
    compressionLevel: 9
};

/**
 * Build Manager Class
 */
class BuildManager {
    constructor() {
        this.manifest = null;
        this.version = null;
        this.outputFilename = null;
    }

    /**
     * Main build process
     */
    async build() {
        try {
            console.log('🚀 Starting ADN Improver build process...');
            
            // Validate environment
            await this.validateEnvironment();
            
            // Load manifest
            this.loadManifest();
            
            // Setup output
            this.setupOutput();
            
            // Create archive
            await this.createArchive();
            
            console.log('✅ Build completed successfully!');
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Validate build environment
     */
    async validateEnvironment() {
        console.log('🔍 Validating build environment...');
        
        // Check required files
        for (const file of CONFIG.requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        
        // Check required directories
        for (const dir of CONFIG.requiredDirectories) {
            if (!fs.existsSync(dir)) {
                throw new Error(`Required directory missing: ${dir}`);
            }
            
            // Check if directory has content
            const files = fs.readdirSync(dir);
            if (files.length === 0) {
                console.warn(`⚠️  Warning: Directory '${dir}' is empty`);
            }
        }
        
        console.log('✅ Environment validation passed');
    }

    /**
     * Load and validate manifest
     */
    loadManifest() {
        console.log('📄 Loading manifest...');
        
        try {
            const manifestContent = fs.readFileSync(CONFIG.manifestFile, 'utf8');
            this.manifest = JSON.parse(manifestContent);
            
            // Validate required manifest fields
            const requiredFields = ['name', 'version', 'manifest_version'];
            for (const field of requiredFields) {
                if (!this.manifest[field]) {
                    throw new Error(`Missing required manifest field: ${field}`);
                }
            }
            
            this.version = this.manifest.version;
            console.log(`📦 Building version: ${this.version}`);
        } catch (error) {
            throw new Error(`Failed to load manifest: ${error.message}`);
        }
    }

    /**
     * Setup output directory and filename
     */
    setupOutput() {
        console.log('📁 Setting up output directory...');
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(CONFIG.outputDir)) {
            fs.mkdirSync(CONFIG.outputDir, { recursive: true });
            console.log(`Created output directory: ${CONFIG.outputDir}`);
        }
        
        // Generate filename with timestamp for uniqueness
        const timestamp = new Date().toISOString().split('T')[0];
        this.outputFilename = `adn-improver-v${this.version}-${timestamp}.zip`;
        
        console.log(`📦 Output file: ${this.outputFilename}`);
    }

    /**
     * Create the extension archive
     */
    async createArchive() {
        return new Promise((resolve, reject) => {
            console.log('🗜️  Creating archive...');
            
            const outputPath = path.join(CONFIG.outputDir, this.outputFilename);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', {
                zlib: { level: CONFIG.compressionLevel }
            });

            // Setup event handlers
            output.on('close', () => {
                const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
                console.log(`✅ Archive created: ${this.outputFilename}`);
                console.log(`📊 Total size: ${sizeInMB} MB (${archive.pointer()} bytes)`);
                resolve();
            });

            archive.on('error', (err) => {
                console.error('❌ Archive error:', err.message);
                reject(err);
            });

            archive.on('warning', (err) => {
                if (err.code === 'ENOENT') {
                    console.warn('⚠️  Archive warning:', err.message);
                } else {
                    reject(err);
                }
            });

            // Pipe archive data to the file
            archive.pipe(output);

            // Add files and directories
            this.addFilesToArchive(archive);

            // Finalize the archive
            archive.finalize();
        });
    }

    /**
     * Add files and directories to the archive
     */
    addFilesToArchive(archive) {
        console.log('📂 Adding files to archive...');
        
        // Add manifest file
        archive.file(CONFIG.manifestFile, { name: CONFIG.manifestFile });
        console.log(`  ✓ Added: ${CONFIG.manifestFile}`);
        
        // Add required directories
        for (const dir of CONFIG.requiredDirectories) {
            if (fs.existsSync(dir)) {
                archive.directory(dir + '/', dir + '/');
                console.log(`  ✓ Added directory: ${dir}/`);
            }
        }
        
        // Add optional directories
        for (const dir of CONFIG.optionalDirectories) {
            if (fs.existsSync(dir)) {
                archive.directory(dir + '/', dir + '/');
                console.log(`  ✓ Added optional directory: ${dir}/`);
            } else {
                console.log(`  ⚠️  Optional directory not found: ${dir}/`);
            }
        }
        
        // Add additional files if they exist
        const additionalFiles = ['README.md', 'LICENSE'];
        for (const file of additionalFiles) {
            if (fs.existsSync(file)) {
                archive.file(file, { name: file });
                console.log(`  ✓ Added: ${file}`);
            }
        }
    }
}

// Run the build if this script is executed directly
if (require.main === module) {
    const buildManager = new BuildManager();
    buildManager.build();
}

module.exports = BuildManager;
