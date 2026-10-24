'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from './button';
import { EmptyState } from './states';

export type Column<T> = { header: string; cell: keyof T | ((row: T) => ReactNode); className?: string };

export function DataTable<T>({ columns, rows, rowKey, label, pageSize = 25, emptyTitle = 'No records found.', emptyHint }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; label: string; pageSize?: number; emptyTitle?: string; emptyHint?: string }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = useMemo(() => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [currentPage, pageSize, rows]);
  return <div className="ui-table-shell"><div className="ui-table-scroll"><table aria-label={label}><thead><tr>{columns.map((column) => <th key={column.header} scope="col" className={column.className}>{column.header}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.header} className={column.className}>{typeof column.cell === 'function' ? column.cell(row) : row[column.cell] as ReactNode}</td>)}</tr>)}{rows.length === 0 ? <tr><td colSpan={columns.length}><EmptyState title={emptyTitle} hint={emptyHint} /></td></tr> : null}</tbody></table></div>{rows.length > pageSize ? <div className="ui-pager"><span aria-live="polite">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} of {rows.length}</span><div><Button variant="secondary" type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>←</Button><span>{currentPage} / {pages}</span><Button variant="secondary" type="button" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(Math.min(pages, currentPage + 1))}>→</Button></div></div> : null}</div>;
}
