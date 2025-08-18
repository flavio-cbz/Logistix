$report = @()
$paths = @(
 'app/api/v1/_disabled-similar-sales/route.ts',
 'app/api/v1/parse-query/route.ts',
 'lib/services/validation/product-test-suite.ts',
 'scripts/cleanup-demo-and-temp-files.ts',
 'scripts/cleanup-old-logs.js',
 'scripts/cleanup-cache-temp.js',
 'scripts/analysis/find_representative_item.py',
 'scripts/analysis/vinted_api_utils.py',
 'scripts/analyze-and-organize-scripts.ts',
 'scripts/maintenance/fetch-vinted-catalogs.js',
 'lib/services/validation/debug-logger-demo.ts',
 'scripts/cleanup-summary-report.md',
 'analysis_reports/reports_auto.md',
 'ANALYSE.md',
 'analysis_reports/ANALYSE.md'
)
foreach($p in $paths) {
  if(Test-Path $p) {
    Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
    $report += "DELETED:$p"
  } else {
    $report += "NOT_FOUND:$p"
  }
}
# delete analysis_reports/reports_batch_*.md
Get-ChildItem -Path 'analysis_reports' -Filter 'reports_batch_*.md' -File -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  $report += "DELETED:" + $_.FullName
}
# delete directories matching cleanup-backup-* and scripts-backup-*
Get-ChildItem -Path . -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'cleanup-backup-*' -or $_.Name -like 'scripts-backup-*' } | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  $report += "DELETED_DIR:" + $_.FullName
}
$report | ForEach-Object { Write-Output $_ }