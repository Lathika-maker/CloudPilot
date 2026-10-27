import React, { useState } from 'react';
import { useCloudPilot } from '../context/CloudPilotContext';
import {
  parseCSVData,
  autoMapColumns,
  normalizeMappedRows,
} from '../services/dataGenerator';
import { exportWorkloadLogsCSV } from '../services/csvExport';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  FileText,
  HelpCircle,
  Layers,
  Play,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';

export const DatasetManagerView: React.FC = () => {
  const {
    dataset,
    datasetMeta,
    loadSampleDataset,
    loadUploadedData,
    setActiveTab,
    trainMLModel,
    startSimulation,
  } = useCloudPilot();

  const [uploadedFileText, setUploadedFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [missingFieldsNotice, setMissingFieldsNotice] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'manager' | 'traces'>('manager');

  // Pagination for preview
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const targetFields = [
    { key: 'timestamp', label: 'Timestamp / Date', required: true },
    { key: 'requests_per_second', label: 'Requests / Sec (RPS)', required: true },
    { key: 'cpu_usage', label: 'CPU Utilization %', required: true },
    { key: 'memory_usage', label: 'Memory / RAM %', required: false },
    { key: 'active_users', label: 'Active Concurrent Users', required: false },
    { key: 'network_usage', label: 'Network Bandwidth (MB/s)', required: false },
    { key: 'response_time', label: 'Response Time / Latency (ms)', required: false },
    { key: 'active_instances', label: 'Active Cloud Instances', required: false },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setUploadSuccess(false);

    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');

    if (!isCsv && !isJson) {
      setErrorMessage('Invalid file format. Please upload a .csv or .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        setUploadedFileText(text);

        if (isCsv) {
          const { headers, rows, preview } = parseCSVData(text);
          setDetectedHeaders(headers);
          setParsedRows(rows);
          setPreviewRows(preview);
          const autoMap = autoMapColumns(headers);
          setColumnMapping(autoMap);

          const { missingFields } = normalizeMappedRows(rows.slice(0, 5), autoMap);
          setMissingFieldsNotice(missingFields);
        } else {
          // JSON parsing
          const json = JSON.parse(text);
          const list = Array.isArray(json) ? json : json.data || json.records || [];
          if (!Array.isArray(list) || list.length === 0) {
            throw new Error('JSON does not contain an array of metric records.');
          }
          const headers = Object.keys(list[0]);
          const strRows = list.map((r: any) => {
            const out: Record<string, string> = {};
            headers.forEach((h) => (out[h] = String(r[h] ?? '')));
            return out;
          });
          setDetectedHeaders(headers);
          setParsedRows(strRows);
          setPreviewRows(strRows.slice(0, 10));
          const autoMap = autoMapColumns(headers);
          setColumnMapping(autoMap);
        }
      } catch (err: any) {
        setErrorMessage(`File parsing error: ${err.message}`);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Error reading uploaded file from disk.');
    };
    reader.readAsText(file);
  };

  const handleApplyMappingAndLoad = () => {
    if (parsedRows.length === 0) {
      setErrorMessage('No valid rows to ingest.');
      return;
    }

    try {
      const { metrics, missingFields } = normalizeMappedRows(parsedRows, columnMapping);
      loadUploadedData(metrics, fileName || 'Uploaded Dataset', columnMapping);
      setUploadSuccess(true);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Failed to normalize records: ${err.message}`);
    }
  };

  const currentRecordsToDisplay = dataset.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(dataset.length / pageSize);

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Dataset Management & Ingestion Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Load synthetic demo data or upload your own workload. CloudPilot does not connect to live production telemetry.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('manager')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeSubTab === 'manager'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Dataset & Upload
          </button>
          <button
            onClick={() => setActiveSubTab('traces')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeSubTab === 'traces'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google / Alibaba Traces Guide
          </button>
        </div>
      </div>

      {activeSubTab === 'manager' ? (
        <div className="space-y-8">
          {/* Active Dataset Status Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Currently Active:</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">{datasetMeta.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {datasetMeta.source}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Total Records: <strong className="text-white font-mono">{(dataset?.length || 0).toLocaleString()} points</strong> |
                Interval: ~1 min | Created: {datasetMeta?.created_at ? new Date(datasetMeta.created_at).toLocaleDateString() : 'Active'}
              </p>
              {exportNotice && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{exportNotice}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const res = exportWorkloadLogsCSV(dataset);
                  setExportNotice(`Exported ${res.rowCount.toLocaleString()} records (${res.filename})`);
                  setTimeout(() => setExportNotice(null), 4000);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 border border-cyan-800 shadow"
                title="Download active dataset records as CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Dataset (CSV)</span>
              </button>
              <button
                onClick={loadSampleDataset}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload 600-point Sample</span>
              </button>
              <button
                onClick={() => {
                  trainMLModel();
                  setActiveTab('ml');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 shadow"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Train ML Model</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('simulation');
                  startSimulation();
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Simulation</span>
              </button>
            </div>
          </div>

          {/* Section: Upload Custom Dataset (CSV / JSON) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload Custom CSV or JSON File</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select a workload metrics file from your local machine to calibrate the scaling model.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-600 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dataset ingested successfully into the cluster! You can now run the ML trainer or simulation.</span>
              </div>
            )}

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 text-center bg-slate-950/50 transition-colors">
              <input
                type="file"
                id="dataset-upload-input"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="dataset-upload-input" className="cursor-pointer space-y-2 block">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-cyan-400 hover:underline">Click to browse</span> or drag and drop files here
                </div>
                <p className="text-[11px] text-slate-500 font-mono">Accepts .CSV, .JSON (Up to 50,000 records supported)</p>
              </label>
            </div>

            {/* Interactive Column Mapping Section if file loaded */}
            {detectedHeaders.length > 0 && (
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Step 2: Map Detected Columns to CloudPilot Schema
                    </h3>
                    <p className="text-xs text-slate-400">
                      Detected <strong className="text-white">{detectedHeaders.length} columns</strong> in{' '}
                      <span className="font-mono text-cyan-400">{fileName}</span> ({parsedRows.length} rows). Verify the auto-detected mapping below:
                    </p>
                  </div>
                </div>

                {missingFieldsNotice.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-300 text-xs">
                    <strong>Notice:</strong> The following optional fields were not found in your file: [{missingFieldsNotice.join(', ')}]. CloudPilot will automatically compute realistic synthetic approximations for any unmapped telemetry.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {targetFields.map((field) => (
                    <div key={field.key} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                      </label>
                      <select
                        value={columnMapping[field.key] || ''}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                      >
                        <option value="">-- None (Auto Estimate) --</option>
                        {detectedHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Data Preview Table */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-400">Uploaded File Preview (First 5 Rows):</span>
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          {detectedHeaders.slice(0, 8).map((h) => (
                            <th key={h} className="px-3 py-2">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {previewRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            {detectedHeaders.slice(0, 8).map((h) => (
                              <td key={h} className="px-3 py-1.5 text-slate-300 truncate max-w-xs">
                                {row[h]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={handleApplyMappingAndLoad}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 shadow-md shadow-cyan-950/50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Apply Mapping & Load Dataset ({(parsedRows?.length || 0).toLocaleString()} rows)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Active Dataset Table with Pagination */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Active Cluster Dataset Explorer</h3>
                <p className="text-xs text-slate-400">
                  Showing rows {((page - 1) * pageSize + 1).toLocaleString()} -{' '}
                  {Math.min(page * pageSize, dataset?.length || 0).toLocaleString()} of {(dataset?.length || 0).toLocaleString()} records.
                </p>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center space-x-2 text-xs font-mono">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                >
                  Prev
                </button>
                <span className="text-slate-400">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="px-3.5 py-2.5">Timestamp</th>
                    <th className="px-3.5 py-2.5">RPS</th>
                    <th className="px-3.5 py-2.5">CPU %</th>
                    <th className="px-3.5 py-2.5">RAM %</th>
                    <th className="px-3.5 py-2.5">Net (MB/s)</th>
                    <th className="px-3.5 py-2.5">Users</th>
                    <th className="px-3.5 py-2.5">Latency</th>
                    <th className="px-3.5 py-2.5">Instances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {currentRecordsToDisplay.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3.5 py-2 text-slate-300 truncate max-w-xs">{row.timestamp}</td>
                      <td className="px-3.5 py-2 text-indigo-400 font-semibold">{row.requests_per_second}</td>
                      <td className="px-3.5 py-2 text-rose-300">{row.cpu_usage.toFixed(1)}%</td>
                      <td className="px-3.5 py-2 text-cyan-300">{row.memory_usage.toFixed(1)}%</td>
                      <td className="px-3.5 py-2 text-slate-400">{row.network_usage}</td>
                      <td className="px-3.5 py-2 text-white">{row.active_users}</td>
                      <td className="px-3.5 py-2 text-amber-300">{row.response_time} ms</td>
                      <td className="px-3.5 py-2 text-emerald-400 font-bold">{row.active_instances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Section 17: Google / Alibaba Real Dataset Documentation & Converter */
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <span>Public Cloud Traces Ingestion Guide (Google & Alibaba Clusters)</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              CloudPilot AI is designed to process real-world traces from hyperscalers like Google and Alibaba.
              Because public trace archives are multi-gigabyte files, this guide explains how researchers extract,
              normalize, and ingest representative slices.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Google Cluster Workload Trace */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-cyan-400">1. Google Cluster Trace (2019 / 2011)</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Borg Cluster
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1.5">
                  <p><strong>Repository Source:</strong> Google Cloud Storage (`gs://clusterdata-2019/`)</p>
                  <p><strong>Primary Table:</strong> `instance_usage.csv.gz`</p>
                  <p><strong>Relevant Columns:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-slate-300 pl-2">
                    <li>`start_time` / `end_time` (microseconds) → Map to timestamp</li>
                    <li>`average_usage.cpus` → Map to cpu_usage</li>
                    <li>`average_usage.memory` → Map to memory_usage</li>
                    <li>`task_index` / `collection_id` → Aggregate to requests_per_second</li>
                  </ul>
                  <p className="pt-2 text-[11px] text-slate-500">
                    <em>Recommended subset:</em> For larger external traces, filter a documented workload window first and preserve the original source and sampling interval.
                  </p>
                </div>
              </div>

              {/* Alibaba Cluster Trace */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-400">2. Alibaba Cluster Trace (2018 / 2020)</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Fuxi Scheduler
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1.5">
                  <p><strong>Repository Source:</strong> GitHub: `alibaba/clusterdata`</p>
                  <p><strong>Primary Table:</strong> `container_usage.csv`</p>
                  <p><strong>Relevant Columns:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-slate-300 pl-2">
                    <li>`time_stamp` (seconds elapsed) → Map to timestamp</li>
                    <li>`cpu_util_percent` → Map to cpu_usage</li>
                    <li>`mem_util_percent` → Map to memory_usage</li>
                    <li>`net_in` / `net_out` → Map to network_usage</li>
                  </ul>
                  <p className="pt-2 text-[11px] text-slate-500">
                    <em>Recommended subset:</em> Filter on `app_du` eCommerce serving microservices during Double-11 shopping festival surge.
                  </p>
                </div>
              </div>
            </div>

            {/* Standard Conversion Script Reference */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-white block">Automated Python Preprocessing Script (Included in repository):</span>
              <pre className="p-3 rounded bg-slate-900 text-cyan-300 font-mono text-[11px] overflow-x-auto">
{`# Located at: ml/convert_trace.py
import pandas as pd

# Load Alibaba container trace subset
df = pd.read_csv('alibaba_raw_sample.csv')
df['timestamp'] = pd.to_datetime(df['time_stamp'], unit='s')
df['requests_per_second'] = (df['cpu_util_percent'] * 12.5).round().astype(int)

# Normalize into CloudPilot standard schema
cloudpilot_df = df[['timestamp', 'cpu_util_percent', 'mem_util_percent', 'requests_per_second']]
cloudpilot_df.columns = ['timestamp', 'cpu_usage', 'memory_usage', 'requests_per_second']
cloudpilot_df.to_csv('datasets/alibaba_normalized.csv', index=False)`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
