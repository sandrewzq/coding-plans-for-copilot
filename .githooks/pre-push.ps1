# Pre-push hook for coding-plans-for-copilot (PowerShell version)
# This hook runs tests before allowing a push
# To install: git config core.hooksPath .githooks

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

Write-Host ""
Write-Host "$Cyan==================================================$Reset"
Write-Host "$Cyan  Pre-push Hook: Running Tests$Reset"
Write-Host "$Cyan==================================================$Reset"
Write-Host ""

# Get the repository root
$repoRoot = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) {
    Write-Host "${Red}Error: Not in a git repository$Reset"
    exit 1
}

# Run the test suite
& node "$repoRoot\tests\run-tests.js"

# Check the exit code
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "$Red==================================================$Reset"
    Write-Host "$Red  ❌ Tests Failed!$Reset"
    Write-Host "$Red==================================================$Reset"
    Write-Host ""
    Write-Host "$Red`Push aborted. Please fix the issues above before pushing.$Reset"
    exit 1
}

Write-Host ""
Write-Host "$Green==================================================$Reset"
Write-Host "$Green  ✅ All Tests Passed!$Reset"
Write-Host "$Green==================================================$Reset"
Write-Host ""
Write-Host "Proceeding with push..."
exit 0
