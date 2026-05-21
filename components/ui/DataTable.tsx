import React from "react";
import type { ReactNode } from "react";

type Column<Row> = {
  key: keyof Row;
  header: string;
};

type DataTableProps<Row extends Record<string, ReactNode>> = {
  caption: string;
  columns: Array<Column<Row>>;
  rows: Row[];
};

export function DataTable<Row extends Record<string, ReactNode>>({ caption, columns, rows }: DataTableProps<Row>) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={String(column.key)}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
