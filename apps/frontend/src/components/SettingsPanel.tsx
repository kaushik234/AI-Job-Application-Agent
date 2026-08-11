/**
 * @file src/components/SettingsPanel.tsx
 * @description Settings configuration panel for target countries, salary limits, automation mode, and company filters.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { AgentSettings, CountryCode } from '@sentinel/types';
import { Settings, Save, Check, Shield, DollarSign, Sliders, Building2 } from 'lucide-react';

interface SettingsPanelProps {
  settings: AgentSettings;
  onUpdateSettings: (updated: Partial<AgentSettings>) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdateSettings }) => {
  const [formData, setFormData] = useState<AgentSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCountryToggle = (code: CountryCode) => {
    const exists = formData.countryFilter.includes(code);
    const next = exists
      ? formData.countryFilter.filter((c) => c !== code)
      : [...formData.countryFilter, code];
    setFormData({ ...formData, countryFilter: next });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" /> Agent Operational Settings
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure target countries, minimum compensation, automation thresholds, and company filters.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : saveSuccess ? 'Settings Saved' : 'Save Preferences'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Country Filter */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 block">Target Countries</label>
          <div className="flex gap-2">
            {(['AU', 'CA', 'DE'] as CountryCode[]).map((code) => {
              const active = formData.countryFilter.includes(code);
              const flags = { AU: '🇦🇺 Australia', CA: '🇨🇦 Canada', DE: '🇩🇪 Germany' };
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCountryToggle(code)}
                  className={`px-3 py-2 rounded-lg border font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {flags[code]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Automation Mode */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 block">Automation Execution Mode</label>
          <select
            value={formData.automationMode}
            onChange={(e) => setFormData({ ...formData, automationMode: e.target.value as any })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="MANUAL_APPROVAL">Manual Approval Mode (Pause before submitting application)</option>
            <option value="FULLY_AUTOMATIC">Fully Automatic Mode (Auto-tailor & auto-submit via Playwright)</option>
          </select>
        </div>

        {/* Salary Threshold */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 flex justify-between">
            <span>Minimum Annual Salary Threshold</span>
            <span className="text-emerald-400 font-bold">${formData.minimumSalary.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min={60000}
            max={250000}
            step={5000}
            value={formData.minimumSalary}
            onChange={(e) => setFormData({ ...formData, minimumSalary: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>

        {/* Daily Limit */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-200 block">Daily Application Submissions Limit</label>
          <input
            type="number"
            value={formData.dailyApplicationLimit}
            onChange={(e) => setFormData({ ...formData, dailyApplicationLimit: Number(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Switches */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={formData.visaRequired}
              onChange={(e) => setFormData({ ...formData, visaRequired: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
            />
            <span className="font-medium">Require Visa Sponsorship Availability</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={formData.remoteOnly}
              onChange={(e) => setFormData({ ...formData, remoteOnly: e.target.checked })}
              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
            />
            <span className="font-medium">Strictly Filter Remote Opportunities Only</span>
          </label>
        </div>
      </div>
    </div>
  );
};
