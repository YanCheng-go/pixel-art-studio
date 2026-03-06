import { useState } from 'react';

const FEEDBACK_TYPES = [
  'Bug report',
  'Feature request',
  'Content suggestion',
  'Other',
] as const;

const MAX_MESSAGE_LENGTH = 500;
const EMAIL = 'chengyan2017@gmail.com';
const GITHUB_ISSUES = 'https://github.com/YanCheng-go/pixel-art-studio/issues';

interface FeedbackDialogProps {
  onClose: () => void;
}

export function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const [type, setType] = useState<string>(FEEDBACK_TYPES[0]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const mailtoSubject = encodeURIComponent(`[Pixel Art Studio] ${type}`);
  const mailtoBody = encodeURIComponent(`Type: ${type}\n\n${message}`);
  const mailtoHref = `mailto:${EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

  const handleSendEmail = () => {
    if (!message.trim()) return;
    window.open(mailtoHref, '_blank');
    setSent(true);
    setTimeout(() => onClose(), 1500);
  };

  if (sent) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog" onClick={(e) => e.stopPropagation()}>
          <h3>Thanks for your feedback!</h3>
          <p className="dialog-desc">We'll review it and use it to improve the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog feedback-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Send Feedback</h3>
        <p className="dialog-desc">
          Have a suggestion, found a bug, or want to request a feature?
        </p>

        <div className="dialog-row">
          <label>Type:</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {FEEDBACK_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="dialog-row">
          <label>Message:</label>
          <textarea
            className="dialog-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="Describe your suggestion or the issue you found..."
            rows={4}
          />
          <span className="feedback-char-count">
            {message.length} / {MAX_MESSAGE_LENGTH}
          </span>
        </div>

        <p className="feedback-alt">
          Or open an issue on{' '}
          <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
            GitHub &rarr;
          </a>
        </p>

        <div className="dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={handleSendEmail}
            disabled={!message.trim()}
          >
            Send via Email
          </button>
        </div>
      </div>
    </div>
  );
}
