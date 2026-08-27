/**
 * pgAdmin PostgreSQL Database DDL Query Generator for Pure Max Water Factory
 * Generates ready-to-execute PostgreSQL 16 DDL/DML queries for pgAdmin 4.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Database, Copy, Check, Terminal, Table, Code, Layers, FileCode, Lock, Play, RefreshCw, AlertCircle, CheckCircle2, Server } from 'lucide-react';

interface TableQuery {
  tableName: string;
  description: string;
  sql: string;
}

export const PgAdminQueriesModule: React.FC = () => {
  const { activeRole } = useApp();
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Query Runner State
  const [liveQuery, setLiveQuery] = useState<string>('SELECT * FROM users ORDER BY id ASC;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    rows?: any[];
    fields?: string[];
    rowCount?: number;
    error?: string;
    durationMs?: number;
  } | null>(null);

  const handleExecuteLiveQuery = async () => {
    if (!liveQuery.trim()) return;
    setIsExecuting(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: liveQuery }),
      });
      const data = await res.json();
      const end = performance.now();
      if (!res.ok) {
        setQueryResult({ error: data.error || 'Query execution failed', durationMs: Math.round(end - start) });
      } else {
        setQueryResult({
          rows: data.rows,
          fields: data.fields,
          rowCount: data.rowCount,
          durationMs: Math.round(end - start),
        });
      }
    } catch (err: any) {
      const end = performance.now();
      setQueryResult({ error: err.message || 'Network error', durationMs: Math.round(end - start) });
    } finally {
      setIsExecuting(false);
    }
  };

  if (activeRole !== 'developer') {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-lg mx-auto my-12 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">Developer Access Only</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Raw PostgreSQL query access and pgAdmin SQL generator tools are strictly restricted to the Lead Developer.
        </p>
      </div>
    );
  }

  const tables: TableQuery[] = [
    {
      tableName: 'users',
      description: 'System user accounts, credentials, canonical roles, and salary data.',
      sql: `-- =========================================================
-- Table: public.users
-- Stores Developer, Manager, CEO, Sales, Operator, and Engineer accounts
-- =========================================================
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    phone VARCHAR(32),
    role VARCHAR(32) NOT NULL,
    department VARCHAR(64),
    status VARCHAR(16) DEFAULT 'active',
    daily_salary_le NUMERIC(12,2) DEFAULT 0,
    monthly_salary_le NUMERIC(12,2) DEFAULT 0,
    is_first_login BOOLEAN DEFAULT true,
    created_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    avatar_url TEXT,
    password_hash VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Seed Initial Developer User (David Henry Sam / DEV-001 / Sam11422)
INSERT INTO public.users (id, employee_id, name, email, phone, role, department, status, daily_salary_le, monthly_salary_le, is_first_login, password_hash)
VALUES ('u-dev-1', 'DEV-001', 'David Henry Sam', 'davidhenrysam1@gmail.com', '+232 76 100 001', 'developer', 'Executive System Administration', 'active', 350000, 9100000, false, '$2b$10$Sam11422HashedDevPass')
ON CONFLICT (email) DO UPDATE 
SET employee_id = 'DEV-001', name = 'David Henry Sam', role = 'developer';`,
    },
    {
      tableName: 'attendance_records',
      description: 'Daily check-in / check-out timestamps and shift approvals.',
      sql: `-- =========================================================
-- Table: public.attendance_records
-- Daily gate attendance, shift timestamps, and geotags
-- =========================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR(128) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    date DATE NOT NULL,
    check_in_time VARCHAR(8) NOT NULL,
    check_out_time VARCHAR(8),
    status VARCHAR(16) DEFAULT 'pending',
    location VARCHAR(128),
    shift VARCHAR(32) DEFAULT 'morning',
    notes TEXT,
    approved_by VARCHAR(64),
    approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_records(user_id);`,
    },
    {
      tableName: 'sales_records',
      description: 'Water bundle sales (Factory, Van, Tricycle) and customer receipts.',
      sql: `-- =========================================================
-- Table: public.sales_records
-- Water bundle dispatch, sales revenue, and generated receipts
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sales_records (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(64) NOT NULL,
    bundle_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price_le NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount_le NUMERIC(12,2) NOT NULL DEFAULT 0,
    recorded_by_id VARCHAR(64) REFERENCES public.users(id),
    recorded_by_name VARCHAR(128) NOT NULL,
    recorded_by_role VARCHAR(32) NOT NULL,
    customer_or_driver VARCHAR(128),
    receipt_number VARCHAR(64) UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales_records(date);
CREATE INDEX IF NOT EXISTS idx_sales_category ON public.sales_records(category);`,
    },
    {
      tableName: 'production_records',
      description: 'Daily sachet water packaging batches, damaged bundles, and clean water volume.',
      sql: `-- =========================================================
-- Table: public.production_records
-- Factory packaging batches, bundle output, and defect tracking
-- =========================================================
CREATE TABLE IF NOT EXISTS public.production_records (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    shift VARCHAR(32) NOT NULL,
    bundles_produced INTEGER NOT NULL DEFAULT 0,
    damaged_bundles INTEGER NOT NULL DEFAULT 0,
    clean_water_litres NUMERIC(12,2) NOT NULL DEFAULT 0,
    batch_number VARCHAR(64) NOT NULL,
    operator_id VARCHAR(64) REFERENCES public.users(id),
    operator_name VARCHAR(128) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_production_date ON public.production_records(date);`,
    },
    {
      tableName: 'expense_records',
      description: 'Operational costs, raw plastics, utilities, vendor bills, and wages.',
      sql: `-- =========================================================
-- Table: public.expense_records
-- Operational expenditures, plastic roll purchases, fuel, and salaries
-- =========================================================
CREATE TABLE IF NOT EXISTS public.expense_records (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(64) NOT NULL,
    item_description TEXT NOT NULL,
    amount_le NUMERIC(12,2) NOT NULL DEFAULT 0,
    vendor VARCHAR(128),
    receipt_number VARCHAR(64),
    recorded_by_id VARCHAR(64) REFERENCES public.users(id),
    receipt_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expense_records(date);`,
    },
    {
      tableName: 'machine_repair_records',
      description: 'Engineering maintenance logs, spare parts replaced, and machine downtime.',
      sql: `-- =========================================================
-- Table: public.machine_repair_records
-- Machine maintenance, spare parts log, and engineering repairs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.machine_repair_records (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    machine_name VARCHAR(128) NOT NULL,
    spare_part VARCHAR(128) NOT NULL,
    cost_le NUMERIC(12,2) NOT NULL DEFAULT 0,
    engineer_id VARCHAR(64) REFERENCES public.users(id),
    engineer_name VARCHAR(128) NOT NULL,
    issue_description TEXT NOT NULL,
    resolution_status VARCHAR(32) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    },
    {
      tableName: 'fuel_records',
      description: 'Fuel consumption logs for delivery vans, tricycles, and factory generators.',
      sql: `-- =========================================================
-- Table: public.fuel_records
-- Fuel distribution for generator power and delivery fleet
-- =========================================================
CREATE TABLE IF NOT EXISTS public.fuel_records (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    vehicle_or_machine VARCHAR(128) NOT NULL,
    litres NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost_per_litre_le NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_cost_le NUMERIC(12,2) NOT NULL DEFAULT 0,
    engineer_id VARCHAR(64) REFERENCES public.users(id),
    engineer_name VARCHAR(128) NOT NULL,
    receipt_number VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    },
    {
      tableName: 'equipment_logs',
      description: 'Water quality telemetry logs (TDS PPM, pH, pressure, UV sterilizer status).',
      sql: `-- =========================================================
-- Table: public.equipment_logs
-- Real-time water purity, TDS levels (<50 PPM target), pH, and UV status
-- =========================================================
CREATE TABLE IF NOT EXISTS public.equipment_logs (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    time VARCHAR(8) NOT NULL,
    tds_level_ppm NUMERIC(6,2) NOT NULL,
    ph_level NUMERIC(4,2) NOT NULL,
    filtration_pressure_psi NUMERIC(6,2) NOT NULL,
    uv_sterilizer_status VARCHAR(32) DEFAULT 'optimal',
    ozone_generator_level NUMERIC(6,2) NOT NULL,
    operator_id VARCHAR(64) REFERENCES public.users(id),
    operator_name VARCHAR(128) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    },
    {
      tableName: 'announcements',
      description: 'Internal broadcasts and priority administrative notices.',
      sql: `-- =========================================================
-- Table: public.announcements
-- System-wide or role-targeted announcements and alerts
-- =========================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(16) DEFAULT 'normal',
    author_id VARCHAR(64) REFERENCES public.users(id),
    author_name VARCHAR(128) NOT NULL,
    author_role VARCHAR(32) NOT NULL,
    target_role VARCHAR(32) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    },
    {
      tableName: 'system_config',
      description: 'Branding, login background image, and banner image configuration.',
      sql: `-- =========================================================
-- Table: public.system_config
-- Dynamic platform parameters (custom login image, UI banner)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_config (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'config_primary',
    factory_name VARCHAR(128) DEFAULT 'Pure Max Factory #1',
    login_bg_url TEXT,
    banner_bg_url TEXT,
    theme_color VARCHAR(32) DEFAULT 'indigo',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    },
  ];

  const fullMigrationSql = `-- =========================================================
-- PURE MAX WATER FACTORY - FULL PGADMIN 4 MIGRATION SCRIPT
-- Database: PostgreSQL 16.2+
-- Generated for Developer: David Henry Sam (DEV-001)
-- =========================================================

CREATE DATABASE puremax_factory_db WITH OWNER = postgres ENCODING = 'UTF8';
\\c puremax_factory_db;

${tables.map((t) => t.sql).join('\n\n')}
`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentDisplaySql =
    selectedTable === 'all'
      ? fullMigrationSql
      : tables.find((t) => t.tableName === selectedTable)?.sql || '';

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 border border-slate-800 text-slate-100 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-700/60 uppercase">
                pgAdmin 4 Query Engine
              </span>
              <span className="text-slate-400 text-xs">PostgreSQL 16.2 Spec</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-sans">
              <Database className="w-6 h-6 text-indigo-400" />
              PostgreSQL DDL & DML Database Query Generator
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Export complete SQL DDL table creation schemas and seed queries for all Pure Max Factory database modules. Ready to execute directly in pgAdmin Query Tool.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(fullMigrationSql, 'all')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 text-white transition border border-indigo-400/30"
          >
            {copiedKey === 'all' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copiedKey === 'all' ? 'Copied Full Script!' : 'Copy Full DDL Script for pgAdmin'}
          </button>
        </div>
      </div>

      {/* Live Interactive Cloud SQL Console */}
      <div className="rounded-2xl bg-slate-950 border border-indigo-500/30 shadow-2xl overflow-hidden font-mono text-xs">
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">Cloud SQL Live PostgreSQL Console</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-700/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REGION: AFRICA (africa-south1)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">Execute real-time SQL queries directly on the production database</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLiveQuery('SELECT * FROM users ORDER BY id ASC;');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
            >
              SELECT users
            </button>
            <button
              onClick={() => {
                setLiveQuery('SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = \'public\';');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
            >
              List Tables
            </button>
            <button
              onClick={handleExecuteLiveQuery}
              disabled={isExecuting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isExecuting ? 'Running...' : 'Run SQL'}
            </button>
          </div>
        </div>

        {/* Query Input Editor */}
        <div className="p-4 bg-[#030712] border-b border-slate-800">
          <textarea
            value={liveQuery}
            onChange={(e) => setLiveQuery(e.target.value)}
            rows={3}
            className="w-full bg-transparent text-emerald-300 font-mono text-xs focus:outline-none resize-y placeholder:text-slate-600"
            placeholder="Enter SQL statement (e.g. SELECT * FROM users;)"
          />
        </div>

        {/* Query Results / Output Panel */}
        {queryResult && (
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {queryResult.error ? (
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <AlertCircle className="w-4 h-4" /> SQL Error
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Success ({queryResult.rowCount} rows returned)
                  </span>
                )}
              </div>
              {queryResult.durationMs !== undefined && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Execution Time: {queryResult.durationMs}ms
                </span>
              )}
            </div>

            {queryResult.error ? (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-xs">
                {queryResult.error}
              </div>
            ) : queryResult.rows && queryResult.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-60 rounded-xl border border-slate-800 custom-scrollbar">
                <table className="w-full text-left font-mono text-[11px] text-slate-200">
                  <thead className="bg-slate-950 text-indigo-300 sticky top-0 border-b border-slate-800">
                    <tr>
                      {queryResult.fields?.map((field) => (
                        <th key={field} className="px-3 py-2 border-r border-slate-800/80 font-bold whitespace-nowrap">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-950/40">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        {queryResult.fields?.map((field) => (
                          <td key={field} className="px-3 py-1.5 border-r border-slate-800/50 whitespace-nowrap">
                            {row[field] === null || row[field] === undefined
                              ? <span className="text-slate-600 italic">NULL</span>
                              : typeof row[field] === 'object'
                              ? JSON.stringify(row[field])
                              : String(row[field])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic">Query executed successfully. 0 rows returned.</p>
            )}
          </div>
        )}
      </div>

      {/* DDL & DML Schema Reference */}
      <div className="pt-2">
        <h3 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          PostgreSQL DDL Migration & Schema Reference
        </h3>
      </div>

      {/* Table Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedTable('all')}
          className={`px-3.5 py-2 rounded-xl font-bold font-mono transition flex items-center gap-1.5 shrink-0 ${
            selectedTable === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Full Migration Script
        </button>

        {tables.map((t) => (
          <button
            key={t.tableName}
            onClick={() => setSelectedTable(t.tableName)}
            className={`px-3.5 py-2 rounded-xl font-mono text-[11px] font-semibold transition flex items-center gap-1.5 shrink-0 ${
              selectedTable === t.tableName
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            {t.tableName}
          </button>
        ))}
      </div>

      {/* SQL Code Terminal Window */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs">
        {/* Terminal Titlebar */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="ml-2 font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              pgadmin4_query_tool.sql — {selectedTable === 'all' ? 'All 10 Tables Schema' : selectedTable}
            </span>
          </div>

          <button
            onClick={() => copyToClipboard(currentDisplaySql, selectedTable)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-[11px] flex items-center gap-1.5 border border-slate-700"
          >
            {copiedKey === selectedTable ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
            {copiedKey === selectedTable ? 'Copied!' : 'Copy Query'}
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 max-h-[500px] overflow-y-auto bg-[#020617] text-slate-300 font-mono text-[12px] leading-relaxed">
          <pre className="whitespace-pre-wrap font-mono selection:bg-indigo-900 selection:text-indigo-200">
            {currentDisplaySql}
          </pre>
        </div>
      </div>
    </div>
  );
};
