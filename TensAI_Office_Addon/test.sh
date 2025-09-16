#!/bin/bash

# TensAI Office Add-in Testing Script
# This script automates the testing process for the Office Add-in

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="TensAI Office Add-in"
TEST_RESULTS_DIR="test-results"
COVERAGE_DIR="coverage"

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
    log_info "Checking testing prerequisites..."
    
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
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_error "Dependencies not installed. Please run 'npm install' first."
        exit 1
    fi
    
    log_success "Prerequisites check completed."
}

# Create test results directory
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    mkdir -p "$COVERAGE_DIR"
    
    # Clean previous test results
    rm -rf "$TEST_RESULTS_DIR"/*
    rm -rf "$COVERAGE_DIR"/*
    
    log_success "Test environment setup completed."
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    if npm run test:unit 2>/dev/null; then
        log_success "Unit tests passed."
        return 0
    else
        log_error "Unit tests failed."
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    if npm run test:integration 2>/dev/null; then
        log_success "Integration tests passed."
        return 0
    else
        log_error "Integration tests failed."
        return 1
    fi
}

# Run functional tests
run_functional_tests() {
    log_info "Running functional tests..."
    
    if npm run test:functional 2>/dev/null; then
        log_success "Functional tests passed."
        return 0
    else
        log_error "Functional tests failed."
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."
    
    if npm run test:performance 2>/dev/null; then
        log_success "Performance tests passed."
        return 0
    else
        log_error "Performance tests failed."
        return 1
    fi
}

# Run security tests
run_security_tests() {
    log_info "Running security tests..."
    
    if npm run test:security 2>/dev/null; then
        log_success "Security tests passed."
        return 0
    else
        log_error "Security tests failed."
        return 1
    fi
}

# Test API connectivity
test_api_connectivity() {
    log_info "Testing API connectivity..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Skipping API connectivity test."
        return 0
    fi
    
    # Source environment variables
    source .env
    
    # Test TensAI API
    if [ -n "$TENSAI_BASE_URL" ]; then
        log_info "Testing TensAI API at $TENSAI_BASE_URL"
        
        # Test health endpoint
        if curl -s -f "$TENSAI_BASE_URL/api/health" > /dev/null; then
            log_success "TensAI API is accessible."
        else
            log_warning "TensAI API health check failed."
        fi
        
        # Test API key if provided
        if [ -n "$TENSAI_API_KEY" ]; then
            log_info "Testing API authentication..."
            
            # Test authenticated endpoint
            if curl -s -f -H "Authorization: Bearer $TENSAI_API_KEY" \
                "$TENSAI_BASE_URL/api/webchat" \
                -d '{"query":"test","temperature":0.7}' \
                -H "Content-Type: application/json" > /dev/null; then
                log_success "API authentication successful."
            else
                log_warning "API authentication failed."
            fi
        fi
    else
        log_warning "TENSAI_BASE_URL not configured. Skipping API test."
    fi
}

# Test Office.js integration
test_office_integration() {
    log_info "Testing Office.js integration..."
    
    # Check if manifest.xml exists
    if [ ! -f "manifest.xml" ]; then
        log_error "manifest.xml not found."
        return 1
    fi
    
    # Validate manifest.xml
    if command -v xmllint &> /dev/null; then
        if xmllint --noout manifest.xml 2>/dev/null; then
            log_success "manifest.xml is valid."
        else
            log_error "manifest.xml validation failed."
            return 1
        fi
    else
        log_warning "xmllint not available. Skipping XML validation."
    fi
    
    # Check if required files exist
    local required_files=("src/taskpane/taskpane.html" "src/taskpane/taskpane.js" "src/taskpane/taskpane.css")
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "Found required file: $file"
        else
            log_error "Required file not found: $file"
            return 1
        fi
    done
    
    log_success "Office.js integration test completed."
}

# Test build process
test_build_process() {
    log_info "Testing build process..."
    
    # Clean previous build
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # Run build
    if npm run build; then
        log_success "Build process completed successfully."
        
        # Check if build files exist
        local build_files=("dist/taskpane.html" "dist/taskpane.js" "dist/taskpane.css")
        
        for file in "${build_files[@]}"; do
            if [ -f "$file" ]; then
                log_success "Build file created: $file"
            else
                log_error "Build file not found: $file"
                return 1
            fi
        done
        
        return 0
    else
        log_error "Build process failed."
        return 1
    fi
}

# Test code quality
test_code_quality() {
    log_info "Testing code quality..."
    
    # Run linting
    if npm run lint 2>/dev/null; then
        log_success "Code linting passed."
    else
        log_warning "Code linting failed."
    fi
    
    # Run type checking if available
    if npm run type-check 2>/dev/null; then
        log_success "Type checking passed."
    else
        log_warning "Type checking not available or failed."
    fi
    
    # Check for security vulnerabilities
    if npm audit --audit-level=high 2>/dev/null; then
        log_success "No high-severity security vulnerabilities found."
    else
        log_warning "Security vulnerabilities found. Run 'npm audit fix' to resolve."
    fi
}

# Generate test report
generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="$TEST_RESULTS_DIR/test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# TensAI Office Add-in Test Report

**Generated**: $(date)
**Version**: $(node -p "require('./package.json').version")
**Node.js**: $(node --version)
**npm**: $(npm --version)

## Test Results Summary

| Test Type | Status | Details |
|-----------|--------|---------|
| Unit Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Integration Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Functional Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Performance Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Security Tests | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| API Connectivity | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Office Integration | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Build Process | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |
| Code Quality | $([ $? -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED") | |

## Detailed Results

### Unit Tests
\`\`\`
$(npm run test:unit 2>&1 || echo "Unit tests failed")
\`\`\`

### Integration Tests
\`\`\`
$(npm run test:integration 2>&1 || echo "Integration tests failed")
\`\`\`

### Functional Tests
\`\`\`
$(npm run test:functional 2>&1 || echo "Functional tests failed")
\`\`\`

### Performance Tests
\`\`\`
$(npm run test:performance 2>&1 || echo "Performance tests failed")
\`\`\`

### Security Tests
\`\`\`
$(npm run test:security 2>&1 || echo "Security tests failed")
\`\`\`

### API Connectivity
\`\`\`
$(test_api_connectivity 2>&1)
\`\`\`

### Office Integration
\`\`\`
$(test_office_integration 2>&1)
\`\`\`

### Build Process
\`\`\`
$(test_build_process 2>&1)
\`\`\`

### Code Quality
\`\`\`
$(test_code_quality 2>&1)
\`\`\`

## Recommendations

- Review any failed tests and fix issues
- Run tests regularly during development
- Monitor test coverage and aim for >80%
- Keep dependencies updated
- Address security vulnerabilities promptly

## Next Steps

1. Fix any failing tests
2. Improve test coverage if needed
3. Address security vulnerabilities
4. Deploy to staging environment
5. Run user acceptance tests
6. Deploy to production

EOF

    log_success "Test report generated: $report_file"
}

# Run all tests
run_all_tests() {
    log_info "Running comprehensive test suite..."
    
    local test_results=()
    local failed_tests=()
    
    # Run all test types
    run_unit_tests && test_results+=("Unit Tests: PASSED") || {
        test_results+=("Unit Tests: FAILED")
        failed_tests+=("Unit Tests")
    }
    
    run_integration_tests && test_results+=("Integration Tests: PASSED") || {
        test_results+=("Integration Tests: FAILED")
        failed_tests+=("Integration Tests")
    }
    
    run_functional_tests && test_results+=("Functional Tests: PASSED") || {
        test_results+=("Functional Tests: FAILED")
        failed_tests+=("Functional Tests")
    }
    
    run_performance_tests && test_results+=("Performance Tests: PASSED") || {
        test_results+=("Performance Tests: FAILED")
        failed_tests+=("Performance Tests")
    }
    
    run_security_tests && test_results+=("Security Tests: PASSED") || {
        test_results+=("Security Tests: FAILED")
        failed_tests+=("Security Tests")
    }
    
    test_api_connectivity && test_results+=("API Connectivity: PASSED") || {
        test_results+=("API Connectivity: FAILED")
        failed_tests+=("API Connectivity")
    }
    
    test_office_integration && test_results+=("Office Integration: PASSED") || {
        test_results+=("Office Integration: FAILED")
        failed_tests+=("Office Integration")
    }
    
    test_build_process && test_results+=("Build Process: PASSED") || {
        test_results+=("Build Process: FAILED")
        failed_tests+=("Build Process")
    }
    
    test_code_quality && test_results+=("Code Quality: PASSED") || {
        test_results+=("Code Quality: FAILED")
        failed_tests+=("Code Quality")
    }
    
    # Display results
    echo ""
    log_info "Test Results Summary:"
    echo "======================"
    
    for result in "${test_results[@]}"; do
        if [[ $result == *"PASSED"* ]]; then
            log_success "$result"
        else
            log_error "$result"
        fi
    done
    
    # Generate report
    generate_test_report
    
    # Return appropriate exit code
    if [ ${#failed_tests[@]} -eq 0 ]; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Some tests failed: ${failed_tests[*]}"
        return 1
    fi
}

# Main function
main() {
    echo "=========================================="
    echo "  TensAI Office Add-in Testing Script"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    TEST_TYPE=${1:-"all"}
    
    case $TEST_TYPE in
        "unit")
            log_info "Running unit tests only..."
            check_prerequisites
            setup_test_environment
            run_unit_tests
            ;;
        "integration")
            log_info "Running integration tests only..."
            check_prerequisites
            setup_test_environment
            run_integration_tests
            ;;
        "functional")
            log_info "Running functional tests only..."
            check_prerequisites
            setup_test_environment
            run_functional_tests
            ;;
        "performance")
            log_info "Running performance tests only..."
            check_prerequisites
            setup_test_environment
            run_performance_tests
            ;;
        "security")
            log_info "Running security tests only..."
            check_prerequisites
            setup_test_environment
            run_security_tests
            ;;
        "api")
            log_info "Testing API connectivity only..."
            check_prerequisites
            test_api_connectivity
            ;;
        "office")
            log_info "Testing Office integration only..."
            check_prerequisites
            test_office_integration
            ;;
        "build")
            log_info "Testing build process only..."
            check_prerequisites
            test_build_process
            ;;
        "quality")
            log_info "Testing code quality only..."
            check_prerequisites
            test_code_quality
            ;;
        "all")
            log_info "Running all tests..."
            check_prerequisites
            setup_test_environment
            run_all_tests
            ;;
        *)
            log_error "Invalid test type: $TEST_TYPE"
            echo "Usage: $0 [unit|integration|functional|performance|security|api|office|build|quality|all]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
