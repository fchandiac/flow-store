'use client';

import { useState } from 'react';
import ReceptionsDataGrid from './ui/ReceptionsDataGrid';
import NewReceptionPage from './ui/NewReceptionPage';

type TabType = 'list' | 'new';

export default function ReceptionsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('list');

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-3 font-medium text-sm transition-colors ${
                        activeTab === 'list'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Lista de Recepciones
                </button>
                <button
                    onClick={() => setActiveTab('new')}
                    className={`px-6 py-3 font-medium text-sm transition-colors ${
                        activeTab === 'new'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Nueva Recepción
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'list' && <ReceptionsDataGrid />}
                {activeTab === 'new' && <NewReceptionPage onSuccess={() => setActiveTab('list')} />}
            </div>
        </div>
    );
}
