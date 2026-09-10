import React, { useState, useRef } from 'react';
import { useDiary } from '../../context/DiaryContext';
import {
  Settings,
  Users,
  Copy,
  Check,
  Download,
  Upload,
  Shield,
  ArrowRightLeft,
  Lock,
  Sparkles,
  Printer,
  RotateCcw,
  User,
  Edit2,
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export const DiarySettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    currentUser,
    otherUser,
    transferOwnership,
    exportArchive,
    importArchive,
    updateUserProfile,
    resetToDemoData,
  } = useDiary();

  const [copiedCode, setCopiedCode] = useState(false);
  const [diaryTitle, setDiaryTitle] = useState(settings.title);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Edit profiles
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserName, setEditUserName] = useState(currentUser.name);
  const [editUserAvatar, setEditUserAvatar] = useState(currentUser.avatar);

  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isSettingsOpen) return null;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(settings.inviteCode);
    setCopiedCode(true);
    audioEngine.playPageTurn();
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ title: diaryTitle });
    audioEngine.playPenScratch();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(currentUser.id, {
      name: editUserName,
      avatar: editUserAvatar,
    });
    setIsEditingUser(false);
    audioEngine.playPageTurn();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const success = importArchive(json);
        if (success) {
          setImportStatus('Diary archive restored successfully!');
        } else {
          setImportStatus('Invalid archive file structure.');
        }
      } catch {
        setImportStatus('Failed to read JSON backup file.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrintJournal = () => {
    audioEngine.playPageTurn();
    window.print();
  };

  const isOwner = currentUser.role === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <input
        type="file"
        ref={importFileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      <div className="relative max-w-xl w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-stone-100 font-medium">
                Diary Preferences & Ownership
              </h3>
              <p className="text-xs text-stone-400 font-serif italic">
                Manage partner invitations, privacy behavior, and export archives.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-stone-400 hover:text-white text-xs font-serif px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700"
          >
            Close ✕
          </button>
        </div>

        {/* Diary Title */}
        <form onSubmit={handleSaveTitle} className="space-y-2">
          <label className="text-xs font-serif uppercase tracking-wider text-stone-400 block">
            Living Journal Title
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={diaryTitle}
              onChange={(e) => setDiaryTitle(e.target.value)}
              className="flex-1 bg-stone-950/70 border border-stone-800 rounded-xl px-3.5 py-2 text-xs font-serif text-stone-200 focus:outline-none focus:border-amber-500/40"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-serif transition-colors"
            >
              Update
            </button>
          </div>
        </form>

        {/* Member Profile Customization */}
        <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-serif">
            <span className="text-stone-300 font-medium flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-400" />
              Your Persona Profile
            </span>
            <button
              onClick={() => setIsEditingUser(!isEditingUser)}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
            >
              <Edit2 className="w-3 h-3" />
              <span>{isEditingUser ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {isEditingUser ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs font-serif pt-1">
              <div>
                <label className="text-stone-400 block mb-1">Your Display Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-stone-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-stone-400 block mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={editUserAvatar}
                  onChange={(e) => setEditUserAvatar(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-stone-200 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500/30 text-amber-200 border border-amber-500/40"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-amber-500/50"
              />
              <div>
                <div className="text-xs font-serif font-medium text-stone-100">{currentUser.name}</div>
                <div className="text-[10px] text-stone-400 capitalize">
                  {currentUser.role === 'owner' ? 'Diary Creator (Owner)' : 'Invited Member'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Partner Invite Code */}
        <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-serif">
            <span className="text-stone-300 font-medium flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              Partner Invitation Code
            </span>
            <span className="text-[10px] text-stone-500">Exact 2-Member Capacity</span>
          </div>
          <p className="text-xs text-stone-400 font-serif italic">
            Each diary holds exactly two souls. Share this secret code to pair devices:
          </p>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-900 border border-amber-500/20">
            <code className="font-mono text-xs text-amber-300 tracking-wider">
              {settings.inviteCode}
            </code>
            <button
              onClick={handleCopyInvite}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-serif transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Delayed Sharing Mode Toggle */}
        <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-serif font-medium text-stone-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Delayed Sharing Mode
              </div>
              <p className="text-[11px] text-stone-400 font-serif italic max-w-sm">
                Prevents one person's entry from influencing the other. Entries unlock side-by-side only when both have written.
              </p>
            </div>

            <button
              onClick={() => updateSettings({ delayedSharing: !settings.delayedSharing })}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.delayedSharing ? 'bg-amber-500' : 'bg-stone-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.delayedSharing ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Ownership Management */}
        <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-serif">
            <span className="text-stone-300 font-medium flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-400" />
              Ownership & Roles
            </span>
            <span className="text-[10px] text-stone-500">
              Current Owner: <strong className="text-stone-300">{isOwner ? 'You' : otherUser.name}</strong>
            </span>
          </div>
          <p className="text-xs text-stone-400 font-serif italic">
            Both members have equal daily writing rights. The owner holds administrative controls over invites, exports, and diary deletion.
          </p>

          <button
            onClick={transferOwnership}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-serif transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>Transfer Diary Ownership to {otherUser.name}</span>
          </button>
        </div>

        {/* Import / Export & Print Tools */}
        <div className="space-y-3 pt-2 border-t border-stone-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={handlePrintJournal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-serif transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Keepsake Book</span>
            </button>

            <button
              onClick={() => importFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-serif transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Restore Backup</span>
            </button>

            <button
              onClick={exportArchive}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-serif transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Archive (JSON)</span>
            </button>
          </div>

          {importStatus && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-serif text-center">
              {importStatus}
            </div>
          )}
        </div>

        {/* Reset to Demo Seed Data */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs font-serif text-stone-500">
          <span>Need to restore the initial storyline?</span>
          <button
            onClick={() => {
              if (window.confirm('Reset diary to default demo stories and chapters?')) {
                resetToDemoData();
              }
            }}
            className="flex items-center gap-1 text-stone-500 hover:text-stone-300 text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
