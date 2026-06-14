import path from 'path';
import { CodeSetterConfig, AIProvider, ReportFormat, Severity } from '../types/index.js';
import { readJsonFile, fileExists, resolvePath } from '../utils/file-utils.js';

const DEFAULT_CONFIG: CodeSetterConfig = {
  path: './',
  ignore: [],
  severity: 'low',
  scanners: {
    quality: { enabled: true },
    security: { enabled: true },
    performance: { enabled: true },
    accessibility: { enabled: true },
    testing: { enabled: true },
    architecture: { enabled: true },
    dependencies: { enabled: true },
  },
  scoring: {
    weights: {
      quality: 0.2,
      security: 0.25,
      performance: 0.2,
      accessibility: 0.1,
      testing: 0.15,
      architecture: 0.1,
    },
  },
  report: {
    formats: ['html', 'json', 'markdown'],
    output: '.codesetter/reports',
    open: false,
  },
};

interface RcFile {
  ignore?: string[];
  severity?: Severity;
  ai?: {
    provider: AIProvider;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  scanners?: Partial<Record<string, { enabled: boolean }>>;
  scoring?: { weights?: Partial<CodeSetterConfig['scoring']['weights']> };
  report?: { formats?: ReportFormat[]; output?: string; open?: boolean };
  plugins?: string[];
}

/**
 * Load CodeSetter configuration by merging:
 * 1. Built-in defaults
 * 2. .codesetterrc.json in the target directory
 * 3. CLI overrides
 */
export async function loadConfig(
  targetPath: string,
  overrides: Partial<CodeSetterConfig> = {}
): Promise<CodeSetterConfig> {
  const resolved = resolvePath(targetPath);
  const rcPath = path.join(resolved, '.codesetterrc.json');

  let fileConfig: Partial<CodeSetterConfig> = {};

  if (await fileExists(rcPath)) {
    const rc = await readJsonFile<RcFile>(rcPath);
    if (rc) {
      fileConfig = {
        ignore: rc.ignore ?? [],
        severity: rc.severity,
        ai: rc.ai,
        scanners: rc.scanners as CodeSetterConfig['scanners'],
        scoring: rc.scoring
          ? {
              weights: {
                ...DEFAULT_CONFIG.scoring.weights,
                ...rc.scoring.weights,
              },
            }
          : undefined,
        report: rc.report
          ? {
              formats: rc.report.formats ?? DEFAULT_CONFIG.report.formats,
              output: rc.report.output ?? DEFAULT_CONFIG.report.output,
              open: rc.report.open,
            }
          : undefined,
        plugins: rc.plugins,
      };
    }
  }

  const merged: CodeSetterConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...overrides,
    path: resolved,
    scanners: {
      ...DEFAULT_CONFIG.scanners,
      ...fileConfig.scanners,
      ...overrides.scanners,
    },
    scoring: {
      weights: {
        ...DEFAULT_CONFIG.scoring.weights,
        ...fileConfig.scoring?.weights,
        ...overrides.scoring?.weights,
      },
    },
    report: {
      formats:
        overrides.report?.formats ??
        fileConfig.report?.formats ??
        DEFAULT_CONFIG.report.formats,
      output:
        overrides.report?.output ??
        fileConfig.report?.output ??
        DEFAULT_CONFIG.report.output,
      open:
        overrides.report?.open ??
        fileConfig.report?.open ??
        DEFAULT_CONFIG.report.open,
    },
    ignore: [
      ...(DEFAULT_CONFIG.ignore ?? []),
      ...(fileConfig.ignore ?? []),
      ...(overrides.ignore ?? []),
    ],
  };

  return merged;
}
