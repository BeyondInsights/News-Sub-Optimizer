"use client";

import React, { useState } from 'react'; // Import useState
import { Toggle } from "@/components/ui/toggle"; // Assuming you have a Toggle component
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { ReportData, ReportType, OutputType } from '@/lib/types';

interface ReportDisplayProps {
  reportData: ReportData | null;
  reportType: ReportType;
  outputType: OutputType;
}

export default function ReportDisplay({ reportData, reportType, outputType }: ReportDisplayProps) {
  const [isPercentageView, setIsPercentageView] = useState(true); // State for toggling view

  if (!reportData) {
    return null; 
  }

  const { products, data: segments } = reportData;

  const getReportTitle = () => {
    const outputLabels = {
      percentage: 'Take Rates (%)',
      population: 'Population Estimates',
      revenue: 'Revenue ($)'
    };
    const typeLabel = reportType === 'tiered' ? 'Tiered Bundles' : 'Independent Products';
    return `Simulation Report - ${outputLabels[outputType]} (${typeLabel})`;
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Headers
    const headers = ["Segment", ...products.map(p => `"${p.name} (${p.config.product || 'N/A'})"`)];
    csvContent += headers.join(",") + "\r\n";

    // Data rows
    segments.forEach(segment => {
      // Group header
      csvContent += `"${segment.group}",${Array(products.length).fill("").join(",")}\r\n`;
      segment.rows.forEach(row => {
        const cells = [
          `"${' '.repeat((row.indent || 0) * 2)}${row.name}"`, // Indent name
          ...products.map(p => `"${row.values[p.id] || ''}"`)
        ];
        csvContent += cells.join(",") + "\r\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cnn_simulation_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-xl font-semibold">{getReportTitle()}</CardTitle>
        <div className="flex items-center space-x-2">
          <Toggle pressed={isPercentageView} onPressedChange={setIsPercentageView} size="sm">
            {isPercentageView ? 'Show Table' : 'Show Percentages'}
          </Toggle>
        </div>
        <Button onClick={downloadCSV} size="sm" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {isPercentageView ? (
            // Percentage/Text View
            <div className="space-y-4">
              {segments.map(segment => (
                <div key={segment.group} className="border rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">{segment.group}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {segment.rows.map(row => (
                      <div key={row.name}>
                        <h4 className={`font-medium ${row.indent === 1 ? 'pl-4' : ''}`}>{row.name}</h4>
                        <ul className="list-disc list-inside pl-4">
                          {products.map(p => (
                            <li key={p.id} className="text-sm">
                              <strong>{p.name}:</strong> {row.values[p.id]}{outputType === 'percentage' ? '%' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Table View (Original)
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 bg-card z-10">Segment</TableHead>
                  {products.map(p => (
                    <TableHead key={p.id} className="min-w-[150px] text-center">
                      {p.name}<br/><span className="text-xs font-normal text-muted-foreground">{p.config.product}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map(segment => (
                  <React.Fragment key={segment.group}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={products.length + 1} className="font-semibold text-base sticky left-0 bg-muted/50 z-10">
                        {segment.group}
                      </TableCell>
                    </TableRow>
                    {segment.rows.map(row => (
                      <TableRow key={row.name}>
                        <TableCell
                          className={`sticky left-0 bg-card z-10 ${row.indent === 1 ? 'pl-8' : row.indent === 0 && segment.group === 'News Access & Subscriptions' ? 'font-medium' : ''}`}
                        >
                          {row.name}
                        </TableCell>
                        {products.map(p => (
                          <TableCell key={p.id} className="text-center">{row.values[p.id]}</TableCell>
                        ))}
                      ))}
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
