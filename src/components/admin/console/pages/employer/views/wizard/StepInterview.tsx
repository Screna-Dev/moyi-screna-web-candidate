import { useEffect, useState } from 'react';
import { Check, Copy, GripVertical, Info, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Criterion, InterviewQuestion, Job } from '../../types';
import { backendQuestions, SUGGESTED_CRITERIA } from '../../mockData';
import { Button, Card, Dialog, Divider, Field, Pill, Segmented, Select, TextArea, TextInput, cx } from '../../ui';
import { CardTitle, ErrorHint } from './shared';
import { interviewErrors, LANGUAGES, MAX_CRITERIA, MAX_QUESTIONS, type InterviewAI, type StepProps } from './logic';

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Regenerated questions keep the backend set's criterion mapping where those
// criteria still exist, otherwise spread across the current criteria.
function regenerateQuestions(criteria: Criterion[]): InterviewQuestion[] {
  const ids = new Set(criteria.map((c) => c.id));
  return backendQuestions.map((q, i) => {
    const kept = q.criteriaIds.filter((id) => ids.has(id));
    const fallback = criteria.length ? [criteria[i % criteria.length].id] : [];
    return { ...q, id: uid('q'), criteriaIds: kept.length ? kept : fallback };
  });
}

// showSettings: the employer app moves length/language/instructions to its own
// step (the API saves them separately); only the review sign-off stays here.
export function StepInterview({ job, update, showErrors, ai, showSettings = true }: StepProps & { showSettings?: boolean }) {
  const err = showErrors ? interviewErrors(job, !!ai) : ({} as Record<string, boolean>);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Any change to what the interview asks invalidates the reviewer's sign-off.
  const patchInterview = (fn: (j: Job) => Partial<Job>) => update((j) => ({ ...fn(j), interviewConfirmed: false }));

  const critName = (id: string) => job.criteria.find((c) => c.id === id)?.name;
  const covered = new Set(job.questions.flatMap((q) => q.criteriaIds));
  const uncovered = job.criteria.filter((c) => !covered.has(c.id) && c.name.trim());

  const setCriterion = (id: string, patch: Partial<Criterion>) =>
    patchInterview((j) => ({ criteria: j.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  // Rewording an AI question marks it edited (reported to the API).
  const setQuestion = (id: string, patch: Partial<InterviewQuestion>) =>
    patchInterview((j) => ({
      questions: j.questions.map((q) => (q.id === id ? { ...q, ...patch, ...(patch.text !== undefined && q.source === 'AI' ? { edited: true } : {}) } : q)),
    }));

  const regenerate = async () => {
    if (!ai) {
      patchInterview((j) => ({ questions: regenerateQuestions(j.criteria) }));
      setEditingQuestion(null);
      setRegenOpen(false);
      toast.success('Questions regenerated');
      return;
    }
    setRegenerating(true);
    try {
      const questions = await ai.suggestQuestions(job.criteria);
      patchInterview(() => ({ questions }));
      setEditingQuestion(null);
      setRegenOpen(false);
      toast.success('Questions regenerated');
      if (questions.some((q) => q.criteriaIds.length === 0)) toast('Some questions need an evaluation criterion. Edit them to pick one.');
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Could not generate questions');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[#1e232f] text-[18px] font-semibold leading-7">Build the structured AI interview</h2>
        <p className="text-[#5a6172] text-[13px]">Define what matters for this role, then review every question before continuing.</p>
      </div>

      {/* ── Criteria ── */}
      <Card className="p-6 flex flex-col gap-4">
        <CardTitle subtitle="These criteria guide the interview questions, report, and candidate ranking.">What should the interview evaluate?</CardTitle>
        <div className="flex flex-col gap-2">
          {job.criteria.map((c) => {
            const editing = editingCriterion === c.id;
            return (
              <div key={c.id} className="flex items-start gap-3 bg-[#f9fafb] border border-[#e1e4ea] rounded-xl px-3 py-3">
                <GripVertical size={16} className="text-[#9ba1b0] mt-0.5 shrink-0" />
                {editing ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <TextInput autoFocus value={c.name} placeholder="Criterion name" onChange={(e) => setCriterion(c.id, { name: e.target.value })} />
                    <TextInput value={c.description} placeholder="What does good look like?" onChange={(e) => setCriterion(c.id, { description: e.target.value })} />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1e232f]">{c.name || <span className="text-[#9ba1b0]">Untitled criterion</span>}</p>
                    <p className="text-[13px] text-[#5a6172]">{c.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setEditingCriterion(editing ? null : c.id)} className="p-1 text-[#5a6172] hover:text-[#3c77f6]" aria-label={editing ? 'Done' : 'Edit'}>
                    {editing ? <Check size={15} /> : <Pencil size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchInterview((j) => ({
                        criteria: j.criteria.filter((x) => x.id !== c.id),
                        questions: j.questions.map((q) => ({ ...q, criteriaIds: q.criteriaIds.filter((id) => id !== c.id) })),
                      }))
                    }
                    className="p-1 text-[#5a6172] hover:text-[#dc2626]"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {job.criteria.length === 0 && <p className="text-[13px] text-[#5a6172] py-2">No criteria yet. Add your own or generate suggestions.</p>}
          <ErrorHint show={!!err.criteria}>{ai ? `Add 1–${MAX_CRITERIA} criteria with distinct names` : 'Add at least one named criterion'}</ErrorHint>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const id = uid('cr');
              patchInterview((j) => ({ criteria: [...j.criteria, { id, name: '', description: '' }] }));
              setEditingCriterion(id);
            }}
            className="flex items-center gap-1 text-[13px] font-medium text-[#3c77f6] hover:underline"
          >
            <Plus size={14} /> Add criterion
          </button>
          <Button size="sm" onClick={() => setSuggestOpen(true)}>
            <Sparkles size={14} className="text-[#3c77f6]" /> Generate suggested criteria
          </Button>
        </div>
      </Card>

      {/* ── Questions ── */}
      <Card className="p-6 flex flex-col gap-4">
        <CardTitle subtitle="Screna generated these questions from the role and evaluation criteria. Review and edit them before publishing.">AI interview questions</CardTitle>
        <div className="flex flex-col gap-3">
          {job.questions.map((q, i) => {
            const editing = editingQuestion === q.id;
            return (
              <div key={q.id} className="border border-[#e1e4ea] rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-md bg-[#eef4ff] text-[#3c77f6] text-[12px] font-semibold flex items-center justify-center">{i + 1}</span>
                  {q.criteriaIds.map((id) =>
                    critName(id) ? (
                      <Pill key={id} tone="gray" className="font-medium">
                        {critName(id)}
                      </Pill>
                    ) : null,
                  )}
                  <span className="ml-auto text-[12px] text-[#5a6172]">~{q.minutes} min</span>
                  <GripVertical size={15} className="text-[#9ba1b0]" />
                  <button type="button" onClick={() => setEditingQuestion(editing ? null : q.id)} className="p-1 text-[#5a6172] hover:text-[#3c77f6]" aria-label={editing ? 'Done' : 'Edit'}>
                    {editing ? <Check size={15} /> : <Pencil size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => patchInterview((j) => ({ questions: [...j.questions.slice(0, i + 1), { ...q, id: uid('q') }, ...j.questions.slice(i + 1)] }))}
                    className="p-1 text-[#5a6172] hover:text-[#3c77f6]"
                    aria-label="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => patchInterview((j) => ({ questions: j.questions.filter((x) => x.id !== q.id) }))}
                    className="p-1 text-[#5a6172] hover:text-[#dc2626]"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {editing ? (
                  <div className="flex flex-col gap-3">
                    <TextArea autoFocus rows={3} value={q.text} placeholder="Write the question candidates will answer" onChange={(e) => setQuestion(q.id, { text: e.target.value })} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] text-[#5a6172]">Evaluates:</span>
                      {job.criteria.map((c) => {
                        const on = q.criteriaIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setQuestion(q.id, { criteriaIds: on ? q.criteriaIds.filter((x) => x !== c.id) : [...q.criteriaIds, c.id] })}
                            className={cx(
                              'text-[12px] px-2 py-0.5 rounded-md border',
                              on ? 'bg-[#eef4ff] border-[#bfd2f6] text-[#3c77f6] font-medium' : 'bg-white border-[#e1e4ea] text-[#5a6172]',
                            )}
                          >
                            {c.name || 'Untitled'}
                          </button>
                        );
                      })}
                      <span className="ml-auto flex items-center gap-1.5 text-[12px] text-[#5a6172]">
                        ~
                        <TextInput
                          type="number"
                          min={1}
                          max={30}
                          value={q.minutes}
                          onChange={(e) => setQuestion(q.id, { minutes: Math.max(1, Number(e.target.value) || 1) })}
                          className="!w-16 !py-1"
                        />
                        min
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] text-[#1e232f] leading-[22px]">{q.text || <span className="text-[#9ba1b0]">Empty question</span>}</p>
                )}
              </div>
            );
          })}
          {job.questions.length === 0 && <p className="text-[13px] text-[#5a6172] py-2">No questions yet.</p>}
          <ErrorHint show={!!err.questions}>
            {ai ? `Add 1–${MAX_QUESTIONS} questions; each needs text and at least one criterion` : 'Add at least one question, and fill in every question'}
          </ErrorHint>
        </div>

        {job.criteria.length > 0 && job.questions.length > 0 && (
          uncovered.length === 0 ? (
            <Pill tone="green" className="w-fit">
              <Check size={12} /> All evaluation criteria are covered
            </Pill>
          ) : (
            <Pill tone="amber" className="w-fit whitespace-normal">
              Not covered by any question: {uncovered.map((c) => c.name).join(', ')}
            </Pill>
          )
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const id = uid('q');
              patchInterview((j) => ({ questions: [...j.questions, { id, text: '', criteriaIds: [], minutes: 5 }] }));
              setEditingQuestion(id);
            }}
            className="flex items-center gap-1 text-[13px] font-medium text-[#3c77f6] hover:underline"
          >
            <Plus size={14} /> Add a question
          </button>
          <Button size="sm" onClick={() => setRegenOpen(true)} disabled={job.criteria.length === 0 || regenerating}>
            <RefreshCw size={14} className={cx('text-[#3c77f6]', regenerating && 'animate-spin')} /> {regenerating ? 'Generating…' : 'Regenerate questions'}
          </Button>
        </div>
      </Card>

      {/* ── Settings ── */}
      <Card className="p-6 flex flex-col gap-5">
        {showSettings && (
          <>
            <CardTitle>Interview settings</CardTitle>
            <InterviewSettingsFields job={job} update={update} />
            <Divider />
          </>
        )}
        <label className="flex items-center gap-2 text-[13px] text-[#1e232f] w-fit cursor-pointer">
          <input type="checkbox" checked={job.interviewConfirmed} onChange={(e) => update({ interviewConfirmed: e.target.checked })} className="w-4 h-4 accent-[#3c77f6]" />
          I reviewed the evaluation criteria and every interview question.
        </label>
        {job.interviewConfirmed ? (
          <Pill tone="green" className="w-fit">
            <Check size={12} /> Interview content confirmed
          </Pill>
        ) : (
          <ErrorHint show={!!err.confirmed}>Confirm you reviewed the interview to continue</ErrorHint>
        )}
      </Card>

      <SuggestedCriteriaDialog
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        job={job}
        ai={ai}
        onAdd={(picked) => {
          patchInterview((j) => ({ criteria: [...j.criteria, ...picked] }));
          toast.success(`${picked.length} ${picked.length === 1 ? 'criterion' : 'criteria'} added`);
        }}
      />

      <Dialog
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        title="Replace the current questions?"
        actions={
          <>
            <Button onClick={() => setRegenOpen(false)}>Keep current questions</Button>
            <Button variant="primary" disabled={regenerating} onClick={regenerate}>
              {regenerating ? 'Generating…' : 'Regenerate'}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-[#5a6172]">Regenerating will replace the current AI-generated questions. Any manual edits will be lost.</p>
      </Dialog>
    </div>
  );
}

export function InterviewSettingsFields({ job, update }: Pick<StepProps, 'job' | 'update'>) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-[#1e232f]">Estimated interview length</span>
        <Segmented<20 | 30 | 45>
          value={job.interviewLength}
          onChange={(v) => update({ interviewLength: v })}
          options={[
            { value: 20, label: '20 min' },
            { value: 30, label: '30 min (Suggested)' },
            { value: 45, label: '45 min' },
          ]}
        />
      </div>
      <Field label="Candidate instructions">
        <TextArea rows={3} value={job.candidateInstructions} onChange={(e) => update({ candidateInstructions: e.target.value })} />
      </Field>
      <Field label="Interview language">
        <Select value={job.language} onChange={(v) => update({ language: v })} options={LANGUAGES} />
      </Field>
    </>
  );
}

function SuggestedCriteriaDialog({ open, onClose, job, onAdd, ai }: { open: boolean; onClose: () => void; job: Job; onAdd: (c: Criterion[]) => void; ai?: InterviewAI }) {
  // With real AI the suggestions are fetched each time the dialog opens.
  const [fetched, setFetched] = useState<Criterion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const suggestions = ai ? fetched ?? [] : SUGGESTED_CRITERIA;
  const existing = new Set(job.criteria.map((c) => c.name.trim().toLowerCase()));
  const options = suggestions.filter((s) => !existing.has(s.name.trim().toLowerCase()));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(SUGGESTED_CRITERIA.slice(0, 2).map((s) => s.id)));
  const picked = options.filter((o) => selected.has(o.id));

  const load = async () => {
    if (!ai) return;
    setLoading(true);
    setLoadError('');
    try {
      const list = await ai.suggestCriteria();
      setFetched(list);
      setSelected(new Set(list.slice(0, 2).map((c) => c.id)));
    } catch (e) {
      setFetched([]);
      setLoadError(e instanceof Error && e.message ? e.message : 'Could not load suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && ai) void load();
    // Refetch per open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Suggested evaluation criteria"
      width={560}
      actions={
        <div className="flex items-center w-full gap-2">
          <span className="text-[13px] text-[#5a6172] mr-auto">
            {picked.length} {picked.length === 1 ? 'criterion' : 'criteria'} selected
          </span>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={picked.length === 0}
            onClick={() => {
              const ids = new Set(job.criteria.map((c) => c.id));
              onAdd(picked.map((p) => (ids.has(p.id) ? { ...p, id: uid('cr') } : { ...p })));
              setSelected(new Set());
              onClose();
            }}
          >
            Add {picked.length} {picked.length === 1 ? 'criterion' : 'criteria'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 -mt-2">
        <p className="text-[13px] text-[#5a6172]">
          Based on the {job.title || 'this'} role and job description, Screna recommends the following criteria.
        </p>
        {job.title && <Pill className="w-fit">{job.title}</Pill>}

        {job.criteria.length > 0 && (
          <div className="bg-[#f9fafb] border border-[#e1e4ea] rounded-xl p-3 flex flex-col gap-2">
            <span className="text-[12px] font-semibold text-[#1e232f]">Already included</span>
            <div className="flex flex-wrap gap-1.5">
              {job.criteria.map((c) => (
                <span key={c.id} className="text-[11px] bg-white border border-[#e1e4ea] rounded-md px-2 py-0.5 text-[#1e232f]">
                  {c.name || 'Untitled'}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-[#5a6172]">Suggestions that duplicate existing criteria have been excluded.</span>
          </div>
        )}

        {!loading &&
          options.map((o) => {
            const on = selected.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                className={cx(
                  'text-left flex items-start gap-3 rounded-xl border p-3 transition-colors',
                  on ? 'border-[#3c77f6] bg-[#f8fbff]' : 'border-[#e1e4ea] bg-white hover:bg-[#f9fafb]',
                )}
              >
                <input type="checkbox" readOnly checked={on} className="w-4 h-4 mt-0.5 accent-[#3c77f6] pointer-events-none" />
                <span className="flex-1 flex flex-col gap-1">
                  <span className="text-[14px] font-semibold text-[#1e232f]">{o.name}</span>
                  <span className="text-[13px] text-[#5a6172]">{o.description}</span>
                  <Pill tone="blue" className="w-fit">AI suggested</Pill>
                </span>
              </button>
            );
          })}
        {loading ? (
          <p className="text-[13px] text-[#5a6172] flex items-center gap-2">
            <RefreshCw size={13} className="animate-spin" /> Generating suggestions…
          </p>
        ) : loadError ? (
          <p className="text-[13px] text-[#dc2626]">{loadError} You can still add criteria manually.</p>
        ) : (
          options.length === 0 && <p className="text-[13px] text-[#5a6172]">Every suggestion is already included.</p>
        )}

        <div className="flex items-start gap-2 bg-[#f9fafb] rounded-lg p-3 text-[12px] text-[#5a6172]">
          <Info size={14} className="shrink-0 mt-0.5" />
          Adding criteria will not automatically replace your existing interview questions. Review question coverage after adding.
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (ai) return void load();
            setSelected(new Set());
            toast('Suggestions refreshed');
          }}
          className="flex items-center gap-1.5 text-[13px] text-[#1e232f] hover:underline w-fit disabled:opacity-50"
        >
          <RefreshCw size={13} /> Regenerate suggestions
        </button>
      </div>
    </Dialog>
  );
}
