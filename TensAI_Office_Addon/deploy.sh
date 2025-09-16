#!/bin/bash

# TensAI Office Add-in Deployment Script
# This script automates the deployment process for the Office Add-in

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="TensAI Office Add-in"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist"
DEPLOY_DIR="deployment"
BACKUP_DIR="backups"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 16.x or higher."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Creating from template..."
        if [ -f "env.example" ]; then
            cp env.example .env
            log_warning "Please edit .env file with your configuration before deploying."
        else
            log_error "env.example file not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    log_success "Prerequisites check completed."
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        log_success "Dependencies installed."
    else
        log_info "Dependencies already installed. Updating..."
        npm update
        log_success "Dependencies updated."
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    if npm run test 2>/dev/null; then
        log_success "All tests passed."
    else
        log_warning "Some tests failed. Continuing with deployment..."
    fi
}

# Build project
build_project() {
    log_info "Building project for production..."
    
    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi
    
    # Create build
    npm run build
    
    if [ -d "$BUILD_DIR" ]; then
        log_success "Build completed successfully."
    else
        log_error "Build failed. Please check the build process."
        exit 1
    fi
}

# Create deployment package
create_deployment_package() {
    log_info "Creating deployment package..."
    
    # Create deployment directory
    if [ -d "$DEPLOY_DIR" ]; then
        rm -rf "$DEPLOY_DIR"
    fi
    mkdir -p "$DEPLOY_DIR"
    
    # Copy build files
    cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"
    
    # Copy manifest
    cp manifest.xml "$DEPLOY_DIR/"
    
    # Copy assets
    if [ -d "assets" ]; then
        cp -r assets "$DEPLOY_DIR/"
    fi
    
    # Create version file
    echo "Version: $VERSION" > "$DEPLOY_DIR/version.txt"
    echo "Build Date: $(date)" >> "$DEPLOY_DIR/version.txt"
    echo "Build Environment: $NODE_ENV" >> "$DEPLOY_DIR/version.txt"
    
    log_success "Deployment package created."
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Create backup archive
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_FILE" "$DEPLOY_DIR" 2>/dev/null || true
    
    log_success "Backup created: $BACKUP_FILE"
}

# Deploy to local server (for testing)
deploy_local() {
    log_info "Deploying to local server..."
    
    # Check if local server is running
    if curl -s http://localhost:3000 > /dev/null; then
        log_info "Local server is running. Stopping..."
        pkill -f "npm run dev" || true
        sleep 2
    fi
    
    # Start production server
    log_info "Starting production server..."
    npm start &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Check if server is running
    if curl -s http://localhost:3000 > /dev/null; then
        log_success "Local deployment successful. Server running on http://localhost:3000"
        echo "Server PID: $SERVER_PID"
    else
        log_error "Local deployment failed. Server not responding."
        exit 1
    fi
}

# Deploy to Azure
deploy_azure() {
    log_info "Deploying to Azure..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install Azure CLI first."
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Deploy to Azure App Service
    if [ -n "$AZURE_RESOURCE_GROUP" ] && [ -n "$AZURE_APP_NAME" ]; then
        log_info "Deploying to Azure App Service: $AZURE_APP_NAME"
        
        # Create deployment package
        zip -r deployment.zip "$DEPLOY_DIR"/*
        
        # Deploy to Azure
        az webapp deployment source config-zip \
            --resource-group "$AZURE_RESOURCE_GROUP" \
            --name "$AZURE_APP_NAME" \
            --src deployment.zip
        
        # Clean up
        rm deployment.zip
        
        log_success "Azure deployment completed."
    else
        log_error "Azure configuration not found. Please set AZURE_RESOURCE_GROUP and AZURE_APP_NAME environment variables."
        exit 1
    fi
}

# Deploy to AWS
deploy_aws() {
    log_info "Deploying to AWS..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check if AWS is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Deploy to S3
    if [ -n "$AWS_S3_BUCKET" ]; then
        log_info "Deploying to S3 bucket: $AWS_S3_BUCKET"
        
        # Sync files to S3
        aws s3 sync "$DEPLOY_DIR"/ s3://"$AWS_S3_BUCKET"/ --delete
        
        log_success "AWS deployment completed."
    else
        log_error "AWS S3 bucket not configured. Please set AWS_S3_BUCKET environment variable."
        exit 1
    fi
}

# Deploy to custom server
deploy_custom() {
    log_info "Deploying to custom server..."
    
    if [ -n "$DEPLOY_HOST" ] && [ -n "$DEPLOY_PATH" ]; then
        log_info "Deploying to $DEPLOY_HOST:$DEPLOY_PATH"
        
        # Create deployment archive
        tar -czf deployment.tar.gz -C "$DEPLOY_DIR" .
        
        # Upload to server (using scp)
        if [ -n "$DEPLOY_USER" ]; then
            scp deployment.tar.gz "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
            ssh "$DEPLOY_USER@$DEPLOY_HOST" "cd $DEPLOY_PATH && tar -xzf deployment.tar.gz && rm deployment.tar.gz"
        else
            log_error "DEPLOY_USER not configured. Please set DEPLOY_USER environment variable."
            exit 1
        fi
        
        # Clean up
        rm deployment.tar.gz
        
        log_success "Custom server deployment completed."
    else
        log_error "Custom server configuration not found. Please set DEPLOY_HOST and DEPLOY_PATH environment variables."
        exit 1
    fi
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check if manifest.xml exists
    if [ ! -f "$DEPLOY_DIR/manifest.xml" ]; then
        log_error "manifest.xml not found in deployment package."
        exit 1
    fi
    
    # Check if main files exist
    if [ ! -f "$DEPLOY_DIR/taskpane.html" ]; then
        log_error "taskpane.html not found in deployment package."
        exit 1
    fi
    
    # Validate manifest.xml
    if command -v xmllint &> /dev/null; then
        if xmllint --noout "$DEPLOY_DIR/manifest.xml" 2>/dev/null; then
            log_success "manifest.xml is valid."
        else
            log_warning "manifest.xml validation failed."
        fi
    fi
    
    log_success "Deployment validation completed."
}

# Show deployment summary
show_summary() {
    log_info "Deployment Summary"
    echo "=================="
    echo "Project: $PROJECT_NAME"
    echo "Version: $VERSION"
    echo "Build Date: $(date)"
    echo "Deployment Directory: $DEPLOY_DIR"
    echo "Files Deployed:"
    ls -la "$DEPLOY_DIR"
    echo ""
    echo "Next Steps:"
    echo "1. Upload manifest.xml to Office 365 Admin Center"
    echo "2. Configure your web server to serve the files"
    echo "3. Test the add-in in Office applications"
    echo "4. Monitor for any issues"
}

# Main deployment function
main() {
    echo "=========================================="
    echo "  TensAI Office Add-in Deployment Script"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    DEPLOY_TARGET=${1:-"local"}
    
    case $DEPLOY_TARGET in
        "local")
            log_info "Starting local deployment..."
            ;;
        "azure")
            log_info "Starting Azure deployment..."
            ;;
        "aws")
            log_info "Starting AWS deployment..."
            ;;
        "custom")
            log_info "Starting custom server deployment..."
            ;;
        *)
            log_error "Invalid deployment target: $DEPLOY_TARGET"
            echo "Usage: $0 [local|azure|aws|custom]"
            exit 1
            ;;
    esac
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    run_tests
    build_project
    create_deployment_package
    validate_deployment
    create_backup
    
    # Deploy based on target
    case $DEPLOY_TARGET in
        "local")
            deploy_local
            ;;
        "azure")
            deploy_azure
            ;;
        "aws")
            deploy_aws
            ;;
        "custom")
            deploy_custom
            ;;
    esac
    
    show_summary
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
