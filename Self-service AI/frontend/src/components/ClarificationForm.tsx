import React, { useState } from 'react';
import type { ClarificationQuestion } from '../types';

interface ClarificationFormProps {
  questions: ClarificationQuestion[];
  onSubmit: (answers: string) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ClarificationForm({
  questions,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ClarificationFormProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required questions
    const unanswered = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => q.required && !answers[i])
      .map(({ i }) => i);

    if (unanswered.length > 0) {
      setError(`Please answer question${unanswered.length > 1 ? 's' : ''} ${unanswered.map(i => i + 1).join(', ')}`);
      return;
    }

    // Validate answers aren't just whitespace
    const emptyAnswers = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => q.required && answers[i] && !answers[i].trim())
      .map(({ i }) => i);

    if (emptyAnswers.length > 0) {
      setError(`Please provide valid answers for question${emptyAnswers.length > 1 ? 's' : ''} ${emptyAnswers.map(i => i + 1).join(', ')}`);
      return;
    }

    // Format answers concisely
    const formattedAnswers = questions
      .map((q, i) => {
        const answer = answers[i];
        if (!answer || !answer.trim()) return null;
        return `Q${i + 1}: ${q.question}\nA: ${answer.trim()}`;
      })
      .filter(Boolean)
      .join('\n\n');

    if (!formattedAnswers) {
      setError('Please provide at least one answer');
      return;
    }

    onSubmit(formattedAnswers);
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
  };

  return (
    <div className="clarification-form">
      <div className="clarification-header">
        <h3>Need More Details</h3>
        <p>Answer {questions.filter(q => q.required).length} question{questions.filter(q => q.required).length !== 1 ? 's' : ''} to continue</p>
      </div>

      {error && (
        <div className="error-message">
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="questions-container">
          {questions.map((question, index) => (
            <div key={index} className="clarification-question">
              <div className="question-header">
                <label>
                  Question {index + 1}
                  {question.required && <span className="required">*</span>}
                </label>
              </div>

              <div className="question-text">{question.question}</div>

              {question.context && (
                <div className="question-context">
                  <small>{question.context}</small>
                </div>
              )}

              {question.suggestedAnswers && question.suggestedAnswers.length > 0 ? (
                <div className="suggested-answers">
                  <label>Select an answer or provide your own:</label>
                  <select
                    value={answers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="answer-select"
                    disabled={isSubmitting}
                  >
                    <option value="">-- Select an option --</option>
                    {question.suggestedAnswers.map((answer, i) => (
                      <option key={i} value={answer}>
                        {answer}
                      </option>
                    ))}
                    <option value="__custom__">Other (type below)</option>
                  </select>

                  {answers[index] === '__custom__' && (
                    <textarea
                      className="answer-textarea"
                      placeholder="Type your answer here..."
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  )}
                </div>
              ) : (
                <textarea
                  className="answer-textarea"
                  placeholder="Type your answer here..."
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  required={question.required}
                />
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </button>
        </div>
      </form>

      <style>{`
        .clarification-form {
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 24px;
          margin: 16px 0;
        }

        .error-message {
          background: #fee2e2;
          border: 1px solid #ef4444;
          color: #991b1b;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .clarification-header {
          margin-bottom: 16px;
        }

        .clarification-header h3 {
          margin: 0 0 8px 0;
          color: #1e40af;
          font-size: 18px;
        }

        .clarification-header p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .questions-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .clarification-question {
          border-left: 3px solid #3b82f6;
          padding-left: 16px;
        }

        .question-header label {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }

        .question-header .required {
          color: #ef4444;
          margin-left: 4px;
        }

        .question-text {
          margin: 8px 0;
          font-size: 15px;
          color: #374151;
        }

        .question-context {
          margin: 4px 0 12px 0;
        }

        .question-context small {
          color: #6b7280;
          font-style: italic;
        }

        .suggested-answers {
          margin-top: 12px;
        }

        .suggested-answers label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          color: #4b5563;
        }

        .answer-select,
        .answer-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .answer-select:focus,
        .answer-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .answer-select:disabled,
        .answer-textarea:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .answer-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .suggested-answers .answer-textarea {
          margin-top: 8px;
        }

        .form-actions {
          margin-top: 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
