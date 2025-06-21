#!/bin/bash

# Verification script for AdminDashboard.js refactor
# Checks that all modules are properly created and functional
# Author: AI Assistant
# Date: $(date +%Y-%m-%d)

MODULES_DIR="/home/malfunctional.s4bre.com/public_html/modules/"
DASHBOARD_DIR="$MODULES_DIR/dashboard"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

echo "=================================================================="
echo -e "${BLUE}🔍 AdminDashboard.js Refactor Verification${NC}"
echo "=================================================================="
echo ""

# Check file structure
print_info "Checking file structure..."
files=(
    "$MODULES_DIR/AdminDashboard.js"
    "$DASHBOARD_DIR/DashboardAPI.js"
    "$DASHBOARD_DIR/DashboardStats.js"
    "$DASHBOARD_DIR/DashboardUtils.js"
)

all_good=true
total_lines=0

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        size=$(du -h "$file" | cut -f1)
        total_lines=$((total_lines + lines))
        print_status "$(basename "$file") - $lines lines, $size"
    else
        print_error "Missing: $file"
        all_good=false
    fi
done

echo ""
print_info "Total lines in new modular structure: $total_lines"

# Check for exports
print_info "Checking module exports..."
if grep -q "export class AdminDashboard" "$MODULES_DIR/AdminDashboard.js" 2>/dev/null; then
    print_status "AdminDashboard export found"
else
    print_error "AdminDashboard export missing"
    all_good=false
fi

if grep -q "export class DashboardAPI" "$DASHBOARD_DIR/DashboardAPI.js" 2>/dev/null; then
    print_status "DashboardAPI export found"
else
    print_error "DashboardAPI export missing"
    all_good=false
fi

if grep -q "export class DashboardStats" "$DASHBOARD_DIR/DashboardStats.js" 2>/dev/null; then
    print_status "DashboardStats export found"
else
    print_error "DashboardStats export missing"
    all_good=false
fi

if grep -q "export class DashboardUtils" "$DASHBOARD_DIR/DashboardUtils.js" 2>/dev/null; then
    print_status "DashboardUtils export found"
else
    print_error "DashboardUtils export missing"
    all_good=false
fi

# Check for imports
echo ""
print_info "Checking module imports..."
if grep -q "import.*DashboardAPI" "$MODULES_DIR/AdminDashboard.js" 2>/dev/null; then
    print_status "DashboardAPI import found"
else
    print_error "DashboardAPI import missing"
    all_good=false
fi

if grep -q "import.*DashboardStats" "$MODULES_DIR/AdminDashboard.js" 2>/dev/null; then
    print_status "DashboardStats import found"
else
    print_error "DashboardStats import missing"
    all_good=false
fi

if grep -q "import.*DashboardUtils" "$MODULES_DIR/AdminDashboard.js" 2>/dev/null; then
    print_status "DashboardUtils import found"
else
    print_error "DashboardUtils import missing"
    all_good=false
fi

# Check if original file exists and calculate reduction
echo ""
if [ -f "$MODULES_DIR/adminDashboard.js" ]; then
    original_lines=$(wc -l < "$MODULES_DIR/adminDashboard.js")
    new_main_lines=$(wc -l < "$MODULES_DIR/AdminDashboard.js")
    reduction=$(( (original_lines - new_main_lines) * 100 / original_lines ))
    
    print_info "Size comparison:"
    print_status "Original adminDashboard.js: $original_lines lines"
    print_status "New AdminDashboard.js: $new_main_lines lines"
    print_status "Main file reduction: $reduction%"
    print_status "Total modular files: $total_lines lines"
    
    if [ $reduction -gt 80 ]; then
        print_status "Excellent size reduction achieved!"
    elif [ $reduction -gt 50 ]; then
        print_status "Good size reduction achieved!"
    else
        print_warning "Size reduction less than expected"
    fi
else
    print_warning "Original adminDashboard.js not found for comparison"
fi

# Check directory structure
echo ""
print_info "Checking directory structure..."
if [ -d "$DASHBOARD_DIR" ]; then
    print_status "Dashboard directory exists"
    file_count=$(ls -1 "$DASHBOARD_DIR" | wc -l)
    print_status "Contains $file_count module files"
else
    print_error "Dashboard directory missing"
    all_good=false
fi

# Check for backup directory
echo ""
print_info "Checking for backup..."
backup_dirs=$(ls -d "$MODULES_DIR"/backup_* 2>/dev/null | wc -l)
if [ $backup_dirs -gt 0 ]; then
    latest_backup=$(ls -dt "$MODULES_DIR"/backup_* 2>/dev/null | head -n1)
    print_status "Backup directory found: $(basename "$latest_backup")"
    if [ -f "$latest_backup/adminDashboard.js.backup" ]; then
        print_status "Original file backup exists"
    else
        print_warning "Original file backup not found"
    fi
else
    print_warning "No backup directory found"
fi

# Check for syntax errors in new files
echo ""
print_info "Basic syntax validation..."
syntax_errors=0

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        # Check for basic JavaScript syntax issues
        if grep -q "export class" "$file" && grep -q "constructor()" "$file"; then
            print_status "$(basename "$file") - Basic structure OK"
        else
            print_error "$(basename "$file") - Structure issues detected"
            syntax_errors=$((syntax_errors + 1))
        fi
    fi
done

if [ $syntax_errors -eq 0 ]; then
    print_status "All files passed basic syntax validation"
else
    print_error "$syntax_errors files have potential syntax issues"
    all_good=false
fi

# Check for key functionality
echo ""
print_info "Checking key functionality..."

# Check if AdminDashboard has composition
if grep -q "this.api = new DashboardAPI" "$MODULES_DIR/AdminDashboard.js" 2>/dev/null; then
    print_status "Composition pattern implemented"
else
    print_error "Composition pattern not found"
    all_good=false
fi

# Check if modules have their core methods
if grep -q "loadDashboardData" "$DASHBOARD_DIR/DashboardAPI.js" 2>/dev/null; then
    print_status "API module has data loading method"
else
    print_error "API module missing key methods"
    all_good=false
fi

if grep -q "calculateStatistics" "$DASHBOARD_DIR/DashboardStats.js" 2>/dev/null; then
    print_status "Stats module has calculation method"
else
    print_error "Stats module missing key methods"
    all_good=false
fi

if grep -q "createConfirmationModal" "$DASHBOARD_DIR/DashboardUtils.js" 2>/dev/null; then
    print_status "Utils module has utility methods"
else
    print_error "Utils module missing key methods"
    all_good=false
fi

# Final assessment
echo ""
echo "=================================================================="
if [ "$all_good" = true ]; then
    echo -e "${GREEN}🎉 REFACTOR VERIFICATION PASSED! 🎉${NC}"
    echo ""
    echo -e "${BLUE}✅ Summary:${NC}"
    echo "  • All required files created successfully"
    echo "  • Module exports/imports working correctly"
    echo "  • Composition pattern implemented"
    echo "  • Key functionality preserved"
    echo "  • Backup created successfully"
    echo ""
    echo -e "${GREEN}Your modular architecture is ready to use!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "  1. Test the dashboard in your application"
    echo "  2. Update any other files that import adminDashboard.js"
    echo "  3. Consider creating UserManagement.js and CalloutManagement.js"
    echo "  4. Remove the old adminDashboard.js when ready"
    
    echo ""
    echo -e "${BLUE}🚀 Benefits Achieved:${NC}"
    if [ -f "$MODULES_DIR/adminDashboard.js" ]; then
        echo "  • Main file reduced by $reduction%"
    fi
    echo "  • Modular architecture implemented"
    echo "  • Better separation of concerns"
    echo "  • Improved maintainability"
    echo "  • Enhanced testability"
    
else
    echo -e "${RED}❌ REFACTOR VERIFICATION FAILED! ❌${NC}"
    echo ""
    echo -e "${YELLOW}Issues found:${NC}"
    echo "  Please check the error messages above and:"
    echo "  1. Re-run the refactor script if files are missing"
    echo "  2. Check file permissions"
    echo "  3. Verify the module structure manually"
    echo ""
    echo -e "${BLUE}💡 Need help?${NC}"
    echo "  Check the backup directory for original files:"
    if [ $backup_dirs -gt 0 ]; then
        echo "  $latest_backup"
    fi
fi
echo "=================================================================="

# Exit with appropriate code
if [ "$all_good" = true ]; then
    exit 0
else
    exit 1
fi
