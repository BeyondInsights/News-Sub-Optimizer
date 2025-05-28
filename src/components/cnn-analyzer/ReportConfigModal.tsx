
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/contexts/AppContext';
import type { ReportType, OutputType } from '@/lib/types';

export default function ReportConfigModal() {
  const { 
    isReportConfigModalOpen, 
    closeReportConfigModal, 
    setReportSettings,
    reportType: currentReportType,
    outputType: currentOutputType
  } = useAppContext();

  const [selectedReportType, setSelectedReportType] = useState<ReportType>(currentReportType);
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>(currentOutputType);

  useEffect(() => {
    if (isReportConfigModalOpen) {
      setSelectedReportType(currentReportType);
      setSelectedOutputType(currentOutputType);
    }
  }, [isReportConfigModalOpen, currentReportType, currentOutputType]);

  const handleSubmit = () => {
    setReportSettings(selectedReportType, selectedOutputType);
    closeReportConfigModal();
  };

  return (
    <Dialog open={isReportConfigModalOpen} onOpenChange={(isOpen) => !isOpen && closeReportConfigModal()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Report</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label className="font-semibold text-base">Report Type:</Label>
            <RadioGroup value={selectedReportType} onValueChange={(value) => setSelectedReportType(value as ReportType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tiered" id="rt-tiered" />
                <Label htmlFor="rt-tiered">Products Included as Part of Tiered Bundles</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="independent" id="rt-independent" />
                <Label htmlFor="rt-independent">Each Product as Independent Product</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-base">Select Output:</Label>
            <RadioGroup value={selectedOutputType} onValueChange={(value) => setSelectedOutputType(value as OutputType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="ot-percentage" />
                <Label htmlFor="ot-percentage">Take Rates (%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="population" id="ot-population" />
                <Label htmlFor="ot-population">Population Counts (#)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="revenue" id="ot-revenue" />
                <Label htmlFor="ot-revenue">Revenue ($)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Set Report Type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
