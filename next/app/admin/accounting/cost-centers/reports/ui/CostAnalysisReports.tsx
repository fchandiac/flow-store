import React, { useState, useEffect, useTransition } from 'react';
import { TextField } from '@/baseComponents/TextField/TextField';
import Select from '@/baseComponents/Select/Select';
import AutoComplete from '@/baseComponents/AutoComplete/AutoComplete';
import { Button } from '@/baseComponents/Button/Button';
import Badge from '@/baseComponents/Badge/Badge';
import DataGrid, { type DataGridColumn } from '@/baseComponents/DataGrid/DataGrid';
import { useAlert } from '@/globalstate/alert/useAlert';
import { getCostAnalysisReport, type CostAnalysisResult, type CostCenterAnalysisItem } from '@/actions/costAnalysis';
import { getBranches } from '@/actions/branches';
import { listCostCenters } from '@/actions/costCenters';
import { listBudgets } from '@/actions/budgets';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
});

type ReportType = 'GASTOS' | 'PRESUPUESTO';

export default function CostAnalysisReports() {
    const { error } = useAlert();
    const [isPending, startTransition] = useTransition();
    const [reportType, setReportType] = useState<ReportType>('GASTOS');
    
    // Filters State
    const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([]);
    
    // Data State
    const [reportData, setReportData] = useState<CostAnalysisResult | null>(null);
    const [branches, setBranches] = useState<{ id: string; label: string }[]>([]);
    const [costCenters, setCostCenters] = useState<{ id: string; label: string }[]>([]);
    const [budgets, setBudgets] = useState<{ id: string; label: string }[]>([]);

    useEffect(() => {
        async function loadOptions() {
            try {
                const [branchesData, ccData, budgetsData] = await Promise.all([
                    getBranches(),
                    listCostCenters(),
                    listBudgets()
                ]);
                setBranches(branchesData.map((b: any) => ({ id: b.id, label: b.name || 'Sin nombre' })));
                setCostCenters(ccData.map((cc: any) => ({ id: cc.id, label: `(${cc.code}) ${cc.name}` })));
                setBudgets(budgetsData.map((b: any) => ({ 
                    id: b.id, 
                    label: `${b.costCenterName} (${b.periodStart} a ${b.periodEnd})` 
                })));
            } catch (err) {
                console.error('Error loading filter options', err);
            }
        }
        loadOptions();
    }, []);

    const handleGenerateReport = () => {
        if (reportType === 'PRESUPUESTO' && !selectedBudgetId) {
            error('Debes seleccionar un presupuesto para la comparativa.');
            return;
        }

        startTransition(async () => {
            try {
                const result = await getCostAnalysisReport({
                    type: reportType === 'PRESUPUESTO' ? 'BUDGET_COMPARISON' : 'EXPENSE_ONLY',
                    dateFrom: reportType === 'GASTOS' ? dateFrom : undefined,
                    dateTo: reportType === 'GASTOS' ? dateTo : undefined,
                    budgetId: reportType === 'PRESUPUESTO' ? selectedBudgetId : undefined,
                    branchIds: selectedBranches,
                    costCenterIds: reportType === 'GASTOS' ? selectedCostCenters : undefined
                });
                setReportData(result);
            } catch (err) {
                error('No se pudo generar el reporte: ' + (err instanceof Error ? err.message : 'Error desconocido'));
            }
        });
    };

    const columns: DataGridColumn[] = [
        { field: 'costCenterCode', headerName: 'Código', width: 100 },
        { field: 'costCenterName', headerName: 'Centro de Costo' },
        { 
            field: 'budgeted', 
            headerName: 'Presupuesto', 
            align: 'right',
            renderCell: (params: any) => <span className="text-gray-600 font-medium">{currencyFormatter.format(Number(params.value))}</span>
        },
        { 
            field: 'expenses', 
            headerName: 'Gasto Real', 
            align: 'right',
            renderCell: (params: any) => <span className="text-rose-600 font-medium">{currencyFormatter.format(Number(params.value))}</span>
        },
        { 
            field: 'variance', 
            headerName: 'Diferencia', 
            align: 'right',
            renderCell: (params: any) => {
                const val = Number(params.value);
                return (
                    <span className={val >= 0 ? 'text-emerald-600' : 'text-rose-600 font-bold'}>
                        {val > 0 ? '+' : ''}{currencyFormatter.format(val)}
                    </span>
                );
            }
        },
        { 
            field: 'utilizationPercent', 
            headerName: '% Ejecu.', 
            align: 'right',
            renderCell: (params: any) => {
                const val = Number(params.value);
                let variant: 'success' | 'warning' | 'error' | 'secondary' = 'secondary';
                if (val > 100) variant = 'error';
                else if (val > 80) variant = 'warning';
                else if (val > 0) variant = 'success';
                
                return (
                    <Badge variant={variant}>
                        {val.toFixed(1)}%
                    </Badge>
                );
            }
        }
    ];

    return (
        <div className="flex h-full flex-col lg:flex-row gap-6">
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-80 flex flex-col gap-6 bg-white p-5 rounded-xl border border-border/60 shadow-sm overflow-y-auto">
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-gray-500">Tipo de Reporte</label>
                        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => { setReportType('GASTOS'); setReportData(null); }}
                                className={`py-1.5 text-xs font-medium rounded-md transition-all ${reportType === 'GASTOS' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Gastos Libres
                            </button>
                            <button 
                                onClick={() => { setReportType('PRESUPUESTO'); setReportData(null); }}
                                className={`py-1.5 text-xs font-medium rounded-md transition-all ${reportType === 'PRESUPUESTO' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Presupuestos
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-gray-100">
                        {reportType === 'GASTOS' ? (
                            <>
                                <TextField
                                    label="Desde"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                                <TextField
                                    label="Hasta"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Centros de Costo</label>
                                    <AutoComplete
                                        options={costCenters}
                                        placeholder="Todos los centros"
                                        onChange={(opt: any) => {
                                            if (opt) setSelectedCostCenters(prev => [...new Set([...prev, opt.id])]);
                                        }}
                                    />
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedCostCenters.map(id => (
                                            <Badge key={id} variant="secondary-outlined" className="pr-1">
                                                {costCenters.find(cc => cc.id === id)?.label}
                                                <button onClick={() => setSelectedCostCenters(selectedCostCenters.filter(cc => cc !== id))} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Seleccionar Presupuesto</label>
                                <AutoComplete
                                    options={budgets}
                                    placeholder="Buscar presupuesto..."
                                    onChange={(opt: any) => {
                                        if (opt) setSelectedBudgetId(opt.id);
                                    }}
                                />
                                {selectedBudgetId && (
                                    <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs">
                                        <p className="font-bold text-primary uppercase">Periodo del Presupuesto</p>
                                        <p className="font-medium mt-1">{budgets.find(b => b.id === selectedBudgetId)?.label}</p>
                                        <p className="mt-1 text-muted-foreground italic">* El reporte usará automáticamente las fechas de inicio y fin del presupuesto seleccionado.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Sucursales (Opcional)</label>
                            <AutoComplete
                                options={branches}
                                placeholder="Todas las sucursales"
                                onChange={(opt: any) => {
                                    if (opt) setSelectedBranches(prev => [...new Set([...prev, opt.id])]);
                                }}
                            />
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedBranches.map(id => (
                                    <Badge key={id} variant="secondary-outlined" className="pr-1">
                                        {branches.find(b => b.id === id)?.label}
                                        <button onClick={() => setSelectedBranches(selectedBranches.filter(b => b !== id))} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Button 
                    variant="primary" 
                    className="w-full mt-auto" 
                    onClick={handleGenerateReport}
                    loading={isPending}
                >
                    Generar Análisis
                </Button>
            </aside>

            {/* Main Content Areas */}
            <main className="flex-1 flex flex-col gap-6 overflow-hidden">
                {!reportData ? (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border/60 rounded-xl bg-gray-50/50">
                        <div className="text-center max-w-sm px-6">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">
                                {reportType === 'GASTOS' ? 'query_stats' : 'account_balance_wallet'}
                            </span>
                            <h4 className="text-lg font-semibold text-gray-900">
                                {reportType === 'GASTOS' ? 'Reporte de Gastos' : 'Control Presupuestario'}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-2">
                                {reportType === 'GASTOS' 
                                    ? 'Analiza el flujo de egresos en un rango de fechas personalizado.' 
                                    : 'Compara el presupuesto seleccionado contra el gasto real ocurrido durante su periodo de vigencia.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Summary Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{reportData.summary.title}</h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                                    <span>Periodo: {reportData.summary.periodLabel}</span>
                                </div>
                            </div>
                            <Button variant="outlined" size="sm" className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">download</span>
                                Exportar Excel
                            </Button>
                        </div>

                        {/* Summary Cards */}
                        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {reportType === 'PRESUPUESTO' ? (
                                <>
                                    <div className="bg-white p-5 rounded-xl border border-border/60 shadow-sm">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Presp. Asignado</p>
                                        <p className="text-2xl font-bold mt-1">{currencyFormatter.format(reportData.summary.totalBudgeted)}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-border/60 shadow-sm">
                                        <p className="text-xs font-semibold text-rose-600 uppercase">Gasto Real</p>
                                        <p className="text-2xl font-bold mt-1">{currencyFormatter.format(reportData.summary.totalExpenses)}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-border/60 shadow-sm">
                                        <p className="text-xs font-semibold text-emerald-600 uppercase">Diferencia</p>
                                        <p className={`text-2xl font-bold mt-1 ${reportData.summary.globalVariance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {currencyFormatter.format(reportData.summary.globalVariance)}
                                        </p>
                                    </div>
                                    <div className="bg-white p-5 rounded-xl border border-border/60 shadow-sm">
                                        <p className="text-xs font-semibold text-primary uppercase">% Ejecución</p>
                                        <p className="text-2xl font-bold mt-1">{reportData.summary.utilizationPercent.toFixed(1)}%</p>
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-1 md:col-span-4 bg-white p-6 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Total Gastos en Periodo</p>
                                        <p className="text-3xl font-black mt-1 text-gray-900">{currencyFormatter.format(reportData.summary.totalExpenses)}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-rose-600 text-2xl">payments</span>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Detailed Table */}
                        <section className="flex-1 bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
                            <header className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">
                                    {reportType === 'PRESUPUESTO' ? 'Análisis de Desviación' : 'Gastos por Centro de Costo'}
                                </h4>
                            </header>
                            <div className="flex-1 overflow-auto">
                                <DataGrid 
                                    columns={columns.filter(col => {
                                        if (reportType === 'GASTOS') {
                                            return !['budgeted', 'variance', 'utilizationPercent'].includes(col.field);
                                        }
                                        return true;
                                    })} 
                                    rows={reportData.byCostCenter} 
                                />
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
