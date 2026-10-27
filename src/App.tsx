import React, { useState } from 'react';
import { CloudPilotProvider, useCloudPilot } from './context/CloudPilotContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { DatasetManagerView } from './components/DatasetManagerView';
import { ManualWorkloadView } from './components/ManualWorkloadView';
import { WhatIfSimulatorView } from './components/WhatIfSimulatorView';
import { SimulationEngineView } from './components/SimulationEngineView';
import { MLModelView } from './components/MLModelView';
import { AutoscalingPoliciesView } from './components/AutoscalingPoliciesView';
import { VirtualInstanceMonitorView } from './components/VirtualInstanceMonitorView';
import { CostAnalysisView } from './components/CostAnalysisView';
import { ArchitectureReportView } from './components/ArchitectureReportView';
import { AwsDeploymentGuideView } from './components/AwsDeploymentGuideView';
import { StrategyInfoModal } from './components/StrategyInfoModal';
import { NoDatasetState } from './components/NoDatasetState';

const MainContent: React.FC = () => {
  const { activeTab, dataset, loadSampleDataset, setActiveTab } = useCloudPilot();
  const needsWorkload = ['dashboard', 'simulation', 'ml', 'scaling', 'instances', 'cost'].includes(activeTab);

  if (dataset.length === 0 && needsWorkload) {
    const isMl = activeTab === 'ml';
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <NoDatasetState
          title={isMl ? 'Load a workload before training the ML model' : 'Load a workload to start the simulation'}
          description={isMl
            ? 'The ML pipeline needs at least 35 ordered workload records. Load the demo data or upload a CSV/JSON file, then train the model to calculate real holdout metrics.'
            : 'This view needs workload records to calculate telemetry, scaling decisions, and cost estimates. CloudPilot starts empty so it cannot show simulated results before you choose data.'}
          onLoadSample={() => { loadSampleDataset(); setActiveTab(activeTab); }}
          onOpenDataset={() => setActiveTab('dataset')}
          onOpenManual={() => setActiveTab('manual')}
        />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {activeTab === 'home' && <HomeView />}
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'dataset' && <DatasetManagerView />}
      {activeTab === 'manual' && <ManualWorkloadView />}
      {activeTab === 'what-if' && <WhatIfSimulatorView />}
      {activeTab === 'simulation' && <SimulationEngineView />}
      {activeTab === 'ml' && <MLModelView />}
      {activeTab === 'scaling' && <AutoscalingPoliciesView />}
      {activeTab === 'instances' && <VirtualInstanceMonitorView />}
      {activeTab === 'cost' && <CostAnalysisView />}
      {activeTab === 'report' && <ArchitectureReportView />}
      {activeTab === 'aws' && <AwsDeploymentGuideView />}
    </main>
  );
};

export default function App() {
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);

  return (
    <CloudPilotProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
        <Navbar onOpenStrategyInfo={() => setIsStrategyModalOpen(true)} />
        <StrategyInfoModal
          isOpen={isStrategyModalOpen}
          onClose={() => setIsStrategyModalOpen(false)}
        />
        <MainContent />
      </div>
    </CloudPilotProvider>
  );
}
