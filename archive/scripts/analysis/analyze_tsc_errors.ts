import * as fs from 'fs';

interface ErrorDetail {
  line: number;
  column: number;
  code: string;
  message: string;
}

interface FileErrorSummary {
  filePath: string;
  totalErrors: number;
  errorTypes: { [key: string]: number };
}

interface AnalysisReport {
  totalErrors: number;
  totalFilesAffected: number;
  top10Files: FileErrorSummary[];
  allFiles: FileErrorSummary[];
  mostFrequentErrorTypesGlobal: { [key: string]: number };
}

const TSC_ERRORS_FILE = 'tsc_errors.txt';
const OUTPUT_REPORT_FILE = 'tsc_analysis_report.json';

function parseErrorLine(line: string): { filePath: string; error: ErrorDetail } | null {
  const parts = line.match(/(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)/);
  if (!parts) {
    return null;
  }
  const [, filePath, lineNumStr, colNumStr, code, message] = parts;
  return {
    filePath: filePath.trim(),
    error: {
      line: parseInt(lineNumStr, 10),
      column: parseInt(colNumStr, 10),
      code,
      message: message.trim(),
    },
  };
}

function analyzeTscErrors(errorsFilePath: string): AnalysisReport {
  const fileContent = fs.readFileSync(errorsFilePath, 'utf-8');
  const lines = fileContent.split('\n').filter(l => l.trim() !== '');

  const fileErrorMap = new Map<string, { totalErrors: number; errorTypes: Map<string, number> }>();
  let totalErrors = 0;
  const globalErrorTypeCounts = new Map<string, number>();

  for (const line of lines) {
    const parsed = parseErrorLine(line);
    if (!parsed) {
      continue;
    }

    totalErrors++;

    const { filePath, error } = parsed;

    if (!fileErrorMap.has(filePath)) {
      fileErrorMap.set(filePath, { totalErrors: 0, errorTypes: new Map<string, number>() });
    }
    const fileSummary = fileErrorMap.get(filePath)!;
    fileSummary.totalErrors++;
    fileSummary.errorTypes.set(error.code, (fileSummary.errorTypes.get(error.code) || 0) + 1);

    globalErrorTypeCounts.set(error.code, (globalErrorTypeCounts.get(error.code) || 0) + 1);
  }

  const allFiles: FileErrorSummary[] = Array.from(fileErrorMap.entries()).map(([filePath, summary]) => ({
    filePath,
    totalErrors: summary.totalErrors,
    errorTypes: Object.fromEntries(summary.errorTypes),
  }));

  allFiles.sort((a, b) => b.totalErrors - a.totalErrors);

  const top10Files = allFiles.slice(0, 10);

  const sortedGlobalErrorTypes = Array.from(globalErrorTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [code, count]) => {
      acc[code] = count;
      return acc;
    }, {} as { [key: string]: number });

  return {
    totalErrors,
    totalFilesAffected: allFiles.length,
    top10Files,
    allFiles,
    mostFrequentErrorTypesGlobal: sortedGlobalErrorTypes,
  };
}

function main() {
  try {
    const report = analyzeTscErrors(TSC_ERRORS_FILE);
    fs.writeFileSync(OUTPUT_REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
    report.top10Files.forEach((file) => {
      const sortedErrorTypes = Object.entries(file.errorTypes).sort((a, b) => b[1] - a[1]);
      sortedErrorTypes.slice(0, 3).forEach(() => {});
    });
    Object.entries(report.mostFrequentErrorTypesGlobal).slice(0, 5).forEach(() => {});
 
  } catch (error) {
    console.error('Erreur lors de l\'analyse des erreurs TypeScript:', error);
  }
}
 
main();