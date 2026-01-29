import { useState } from 'react';
import { CreateRequestDTO } from '../types';
import { requestsApi } from '../api';

interface IntakeFormProps {
  onSubmit: () => void;
}

const SAMPLE_CLIENTS = ['Contoso Corp', 'Northwind Traders', 'Adventure Works', 'Fabrikam Inc'];
const SAMPLE_MODELS = ['Finance Model', 'Sales Analytics', 'HR Dashboard', 'Operations KPIs'];

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CreateRequestDTO>({
    clientId: '',
    modelName: '',
    title: '',
    description: '',
    urgency: 'medium',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await requestsApi.create(formData);
      setSuccess(true);
      setFormData({
        clientId: formData.clientId,
        modelName: formData.modelName,
        title: '',
        description: '',
        urgency: 'medium',
      });
      onSubmit();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="intake-form">
      <h2>Submit Change Request</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Request submitted successfully! Processing...</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="clientId">Client</label>
            <select
              id="clientId"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
            >
              <option value="">Select client...</option>
              {SAMPLE_CLIENTS.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="modelName">PowerBI Model</label>
            <select
              id="modelName"
              name="modelName"
              value={formData.modelName}
              onChange={handleChange}
              required
            >
              <option value="">Select model...</option>
              {SAMPLE_MODELS.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">Request Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Brief title for the change request"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the change you need. Be specific about:
- What measure/report needs changing
- What the current behavior is
- What you want it to do instead
- Any specific DAX formulas or calculations needed"
            rows={6}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="urgency">Urgency</label>
          <select
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
          >
            <option value="low">Low - When convenient</option>
            <option value="medium">Medium - This week</option>
            <option value="high">High - Within 24 hours</option>
            <option value="critical">Critical - ASAP</option>
          </select>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <div className="sample-requests">
        <h4>Try these sample requests:</h4>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setFormData(prev => ({
            ...prev,
            title: 'Fix Gross Margin calculation',
            description: 'The Gross Margin % measure is showing incorrect values. It should be calculated as (Total Sales - Total Cost) / Total Sales, but currently it seems to be dividing by Total Cost instead.',
          }))}
        >
          DAX Formula Fix
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setFormData(prev => ({
            ...prev,
            title: 'Add Year-over-Year Sales measure',
            description: 'Please create a new measure that shows the year-over-year percentage change in Total Sales. It should compare the current year to the previous year and show the difference as a percentage.',
          }))}
        >
          New Measure
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setFormData(prev => ({
            ...prev,
            title: 'Create new Sales by Region report',
            description: 'We need a new report page that shows sales breakdown by geographic region. Should include a map visual, bar chart of top regions, and a detailed table with filtering by date range and product category.',
          }))}
        >
          New Report (Complex)
        </button>
      </div>
    </div>
  );
}
