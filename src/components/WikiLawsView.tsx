import React, { useState } from 'react';
import { LawArticle, LawChapter, LawNode, WikiSection } from '../types/rpTypes';
import { CITIZEN_MEMO_GUIDE } from '../data/initialRpData';
import { NATIONALITIES_DATA } from '../data/nationalitiesData';
import { LaurelHeaderDivider, MeanderDivider, WaxSealBadge } from './PonticPrimitives';
import { sound } from '../utils/sound';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  PlusCircle,
  Scale,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface WikiLawsViewProps {
  lawChapters: LawChapter[];
  wikiSections: WikiSection[];
  isGmMode: boolean;
  onAddLawArticle: (
    chapterId: string,
    articleNumber: string,
    title: string,
    text: string,
    clauses: string[]
  ) => void;
  onUpdateLawArticle?: (
    chapterId: string,
    articleId: string,
    updates: {
      number: string;
      title: string;
      text: string;
      clauses: string[];
    }
  ) => void;
  onDeleteLawArticle?: (chapterId: string, articleId: string) => void;
  onOpenOnboardingGuide: () => void;
}

interface ParsedSubArticle {
  id: string;
  marker: string;
  title: string;
  bodyLines: string[];
  childNodes?: LawNode[];
}

interface ExtractedArticleStructure {
  preambleLines: string[];
  subArticles: ParsedSubArticle[];
}

const SUB_ARTICLE_HEADING_RE =
  /^(?:(\d+\.|Этап\s+\d+\.|Раздел\s+\d+\.|Шаблон\s+№\d+[^:]*:?))\s*(.*)$/i;

const INNER_CLAUSE_MARKER_RE =
  /^(\s*)([a-zа-я]\.|(?:i{1,3}|iv|v|vi{0,3})\.|\d+\)|—)\s+(.*)$/i;

function nodeMatchesQuery(node: LawNode, q: string): boolean {
  if (
    (node.marker && node.marker.toLowerCase().includes(q)) ||
    (node.content && node.content.toLowerCase().includes(q))
  ) {
    return true;
  }
  return (node.children || []).some((ch) => nodeMatchesQuery(ch, q));
}

function subArticleMatchesQuery(sub: ParsedSubArticle, q: string): boolean {
  if (!q) return true;
  if (
    sub.marker.toLowerCase().includes(q) ||
    sub.title.toLowerCase().includes(q) ||
    sub.bodyLines.some((l) => l.toLowerCase().includes(q))
  ) {
    return true;
  }
  if (sub.childNodes && sub.childNodes.some((nd) => nodeMatchesQuery(nd, q))) {
    return true;
  }
  return false;
}

/**
 * Splits a LawArticle into optional introductory preamble lines and Level-3 collapsible sub-articles
 * (e.g., "1. Государственные награды", "2. Почётный статус Знатного гражданина", "3. Почётные титулы Понта").
 * Inner sub-clauses (a., b., i., ii., —) remain inside each sub-article without further collapsing.
 */
function extractArticleStructure(art: LawArticle): ExtractedArticleStructure {
  // 1. If hierarchical nodes from Supabase `law_article_nodes` are present:
  if (art.nodes && art.nodes.length > 0) {
    const hasCollapsibleRoots = art.nodes.some(
      (n) =>
        (n.children && n.children.length > 0) ||
        (n.marker && /^(\d+\.|Этап|Раздел|Шаблон)/i.test(n.marker.trim()))
    );

    if (!hasCollapsibleRoots) {
      return {
        preambleLines: art.nodes.map((n) =>
          n.marker ? `${n.marker} ${n.content}` : n.content
        ),
        subArticles: [],
      };
    }

    const preambleLines: string[] = [];
    const subArticles: ParsedSubArticle[] = [];

    art.nodes.forEach((node, idx) => {
      const isRootSubArticle =
        (node.children && node.children.length > 0) ||
        (node.marker && /^(\d+\.|Этап|Раздел|Шаблон)/i.test(node.marker.trim()));

      if (!isRootSubArticle && subArticles.length === 0) {
        preambleLines.push(
          node.marker ? `${node.marker} ${node.content}` : node.content
        );
      } else {
        const lines = (node.content || '').split('\n').map((s) => s.trimEnd());
        const firstLine = (lines[0] || '').replace(/:$/, '').trim();
        const restLines = lines.slice(1).filter((s) => s.trim().length > 0);
        subArticles.push({
          id: `${art.id}-sub-${node.id || idx}`,
          marker: (node.marker || `${subArticles.length + 1}.`).trim(),
          title: firstLine || 'Положение статьи',
          bodyLines: restLines,
          childNodes: node.children || [],
        });
      }
    });

    return { preambleLines, subArticles };
  }

  // 2. Parse from local/fallback `art.text` and `art.clauses`:
  const rawBlocks = [art.text, ...(art.clauses || [])].filter(
    (b) => typeof b === 'string' && b.trim().length > 0
  );

  const preambleLines: string[] = [];
  const subArticles: ParsedSubArticle[] = [];

  rawBlocks.forEach((block, idx) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const firstLine = lines[0].trim();
    const match = firstLine.match(SUB_ARTICLE_HEADING_RE);

    if (match) {
      const marker = match[1].trim().replace(/:$/, '');
      const restOfFirstLine = (match[2] || '').trim().replace(/:$/, '');
      const bodyLines = lines.slice(1);

      subArticles.push({
        id: `${art.id}-sub-${idx + 1}`,
        marker,
        title: restOfFirstLine || firstLine.replace(/:$/, ''),
        bodyLines,
      });
    } else if (subArticles.length === 0) {
      // Preamble block (e.g. intro before Этап 1 in art-2-3, or flat list of ranks in art-1-10)
      preambleLines.push(...lines);
    } else {
      // Continuation block if any
      subArticles[subArticles.length - 1].bodyLines.push(...lines);
    }
  });

  return { preambleLines, subArticles };
}

function LawNodeView({ node }: { node: LawNode }) {
  return (
    <div className="law-node space-y-1">
      <div
        className={`law-line ${
          node.marker
            ? 'grid grid-cols-[2.2rem_minmax(0,1fr)] gap-2 items-baseline'
            : 'block'
        } leading-relaxed`}
      >
        {node.marker && (
          <span className="law-marker font-epigraphic font-semibold text-[#C4AD83] text-xs sm:text-sm select-none">
            {node.marker}
          </span>
        )}
        <span className="text-xs sm:text-sm text-[#E2DAC2] whitespace-pre-line">
          {node.content}
        </span>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="law-children my-1.5 ml-4 pl-3 border-l border-[#9A7B38]/50 space-y-1.5">
          {node.children.map((child) => (
            <LawNodeView key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormattedClauseLines({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const leadingSpaces = (line.match(/^(\s*)/)?.[1] || '').length;
        const trimmed = line.trim();
        const clauseMatch = trimmed.match(INNER_CLAUSE_MARKER_RE);

        const indentClass =
          leadingSpaces >= 4
            ? 'ml-7 pl-3 border-l border-[#9A7B38]/40'
            : leadingSpaces >= 2
              ? 'ml-4 pl-3 border-l border-[#9A7B38]/50'
              : '';

        if (clauseMatch) {
          const marker = clauseMatch[2];
          const content = clauseMatch[3];
          return (
            <div
              key={i}
              className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-2 items-baseline leading-relaxed ${indentClass}`}
            >
              <span className="font-epigraphic font-semibold text-[#C4AD83] text-xs sm:text-sm select-none">
                {marker}
              </span>
              <span className="text-xs sm:text-sm text-[#E2DAC2]">
                {content}
              </span>
            </div>
          );
        }

        return (
          <p
            key={i}
            className={`text-xs sm:text-sm text-[#E2DAC2] leading-relaxed ${indentClass}`}
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export const WikiLawsView: React.FC<WikiLawsViewProps> = ({
  lawChapters,
  wikiSections,
  isGmMode,
  onAddLawArticle,
  onUpdateLawArticle,
  onDeleteLawArticle,
  onOpenOnboardingGuide,
}) => {
  const [subView, setSubView] = useState<'laws' | 'wiki'>('laws');
  const [searchQuery, setSearchQuery] = useState('');

  // Level 1: Collapsible Documents (e.g., КОДЕКС ПОНТИЙСКОЙ РЕСПУБЛИКИ)
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'chap-1': true,
    'chap-2': false,
    'chap-3': false,
  });

  // Level 2: Collapsible Sections / Articles inside a Document (e.g., Статья 8. Почётная знать, государственные награды и титулы Понта)
  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({});

  // Level 3: Collapsible Sub-articles inside a Section (e.g., 1. Государственные награды, 2. Почётный статус Знатного гражданина)
  const [expandedSubArticles, setExpandedSubArticles] = useState<Record<string, boolean>>({});

  // GM add law article state
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [targetChapId, setTargetChapId] = useState<string>(
    lawChapters[0]?.id || 'chap-1'
  );
  const [newArtNum, setNewArtNum] = useState('Статья 12');
  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtText, setNewArtText] = useState('');
  const [newArtClause, setNewArtClause] = useState('');

  // GM edit law article state
  const [editingArticleKey, setEditingArticleKey] = useState<{
    chapterId: string;
    articleId: string;
  } | null>(null);
  const [editArtNum, setEditArtNum] = useState('');
  const [editArtTitle, setEditArtTitle] = useState('');
  const [editArtText, setEditArtText] = useState('');
  const [editArtClausesText, setEditArtClausesText] = useState('');

  const toggleChapter = (chapId: string) => {
    sound.playStoneTap();
    setExpandedChapters((prev) => ({
      ...prev,
      [chapId]: !prev[chapId],
    }));
  };

  const toggleArticle = (artId: string) => {
    sound.playStoneTap();
    setExpandedArticles((prev) => ({
      ...prev,
      [artId]: !prev[artId],
    }));
  };

  const toggleSubArticle = (subId: string) => {
    sound.playStoneTap();
    setExpandedSubArticles((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const expandAll = () => {
    sound.playStoneTap();
    const chaps: Record<string, boolean> = {};
    const arts: Record<string, boolean> = {};
    const subs: Record<string, boolean> = {};
    lawChapters.forEach((c) => {
      chaps[c.id] = true;
      c.articles.forEach((a) => {
        arts[a.id] = true;
        const { subArticles } = extractArticleStructure(a);
        subArticles.forEach((s) => {
          subs[s.id] = true;
        });
      });
    });
    setExpandedChapters(chaps);
    setExpandedArticles(arts);
    setExpandedSubArticles(subs);
  };

  const collapseAll = () => {
    sound.playStoneTap();
    setExpandedChapters({});
    setExpandedArticles({});
    setExpandedSubArticles({});
  };

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtTitle.trim() || !newArtText.trim()) return;
    sound.playWaxSeal();
    onAddLawArticle(
      targetChapId,
      newArtNum.trim() || 'Новая статья',
      newArtTitle.trim(),
      newArtText.trim(),
      newArtClause.trim() ? [newArtClause.trim()] : []
    );
    setNewArtTitle('');
    setNewArtText('');
    setNewArtClause('');
    setShowAddArticle(false);
    setExpandedChapters((prev) => ({ ...prev, [targetChapId]: true }));
  };

  const q = searchQuery.trim().toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="stele-panel p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#263140] pb-4">
          <div className="flex items-center gap-3.5">
            <WaxSealBadge sigil="STRATIOS" size="md" />
            <div>
              <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
                Мраморный Свод Законов и Энциклопедия Мира
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#E6E0D0] mt-0.5">
                Книга Законов (Конституция Понта) и Мини-Вики РП
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setSubView('laws');
              }}
              className={`min-h-[42px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                subView === 'laws'
                  ? 'bg-[#263140] text-[#C4AD83] border-[#9E8658]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Книга Законов и Конституция</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setSubView('wiki');
              }}
              className={`min-h-[42px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                subView === 'wiki'
                  ? 'bg-[#263140] text-[#C4AD83] border-[#9E8658]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Мини-Вики (Памятка, Правила РП и Народы)</span>
            </button>
          </div>
        </div>

        {/* SUBVIEW 1: BOOK OF LAWS & 3-LEVEL COLLAPSIBLE CONSTITUTION */}
        {subView === 'laws' ? (
          <div className="mt-5 space-y-5">
            {/* Search, Quick Chapter Navigation & Expand/Collapse All Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="wax-recess px-3 py-2 flex-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#C2B280] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по документам, разделам, статьям и подпунктам..."
                  className="w-full bg-transparent text-sm text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronsUpDown className="w-4 h-4 text-[#C4AD83]" />
                  <span>Развернуть всё</span>
                </button>

                <button
                  type="button"
                  onClick={collapseAll}
                  className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronsDownUp className="w-4 h-4 text-[#C2B280]" />
                  <span>Свернуть всё</span>
                </button>

                {isGmMode && (
                  <button
                    type="button"
                    onClick={() => setShowAddArticle(!showAddArticle)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Добавить раздел / статью (ГМ)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Document Jump Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {lawChapters.map((chap) => (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    setExpandedChapters((prev) => ({ ...prev, [chap.id]: true }));
                    const el = document.getElementById(`law-${chap.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="px-3 py-1.5 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9A7B38]/50 text-xs font-epigraphic text-[#E6E0D0] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {chap.romanNumeral ? `${chap.romanNumeral}: ` : ''}
                  {chap.title.split('(')[0]}
                </button>
              ))}
            </div>

            {/* GM Add Law Article Form */}
            {isGmMode && showAddArticle && (
              <form
                onSubmit={handleCreateArticle}
                className="p-4 rounded bg-[#1B232E] border border-[#9E8658] space-y-3"
              >
                <h4 className="font-display text-base font-bold text-[#E6E0D0]">
                  Внести новую статью в Книгу Законов (Режим ГМ)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                      Документ
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <select
                        value={targetChapId}
                        onChange={(e) => setTargetChapId(e.target.value)}
                        className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none"
                      >
                        {lawChapters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.romanNumeral ? `${c.romanNumeral} — ` : ''}
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                      Номер раздела / статьи
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        value={newArtNum}
                        onChange={(e) => setNewArtNum(e.target.value)}
                        placeholder="Статья 12"
                        className="w-full bg-transparent text-xs text-[#C4AD83] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                      Заголовок раздела / статьи *
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        required
                        value={newArtTitle}
                        onChange={(e) => setNewArtTitle(e.target.value)}
                        placeholder="О морских займах и поручительстве"
                        className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="wax-recess p-2.5">
                  <textarea
                    rows={2}
                    required
                    value={newArtText}
                    onChange={(e) => setNewArtText(e.target.value)}
                    placeholder="1. Название первой статьи&#10;a. Первый подпункт..."
                    className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                  />
                </div>
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    value={newArtClause}
                    onChange={(e) => setNewArtClause(e.target.value)}
                    placeholder="2. Вторая статья (по желанию)..."
                    className="w-full bg-transparent text-xs text-[#C2B280] focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddArticle(false)}
                    className="px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                  >
                    Высечь в Кодексе
                  </button>
                </div>
              </form>
            )}

            {/* 3-LEVEL HIERARCHY:
                Level 1: Document (chap)
                Level 2: Section / Article (art, e.g. "Статья 8. Почётная знать, государственные награды и титулы Понта")
                Level 3: Sub-article (sub, e.g. "1. Государственные награды") -> expands to show non-collapsible a., b., i., ii. */}
            <div className="space-y-4">
              {lawChapters.map((chap) => {
                const filteredArticles = chap.articles.filter(
                  (art) =>
                    !q ||
                    art.title.toLowerCase().includes(q) ||
                    (art.text && art.text.toLowerCase().includes(q)) ||
                    art.number.toLowerCase().includes(q) ||
                    (art.clauses &&
                      art.clauses.some((cl) => cl.toLowerCase().includes(q))) ||
                    (art.nodes &&
                      art.nodes.some((nd) => nodeMatchesQuery(nd, q)))
                );

                if (q && filteredArticles.length === 0) return null;

                const isChapOpen = q ? true : !!expandedChapters[chap.id];

                return (
                  <div
                    key={chap.id}
                    id={`law-${chap.id}`}
                    className="rounded bg-[#1B232E] border border-[#9A7B38]/60 overflow-hidden"
                  >
                    {/* LEVEL 1: Document Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-[#263140]/70 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-epigraphic text-xs uppercase tracking-widest text-[#C4AD83] font-bold">
                          {chap.romanNumeral ? `${chap.romanNumeral} · ` : ''}
                          Разделов документа: {filteredArticles.length}
                        </span>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-[#E6E0D0] mt-0.5">
                          {chap.title}
                        </h3>
                        <p className="text-xs text-[#C2B280] mt-0.5">{chap.subtitle}</p>
                      </div>
                      <div className="w-9 h-9 rounded bg-[#121820] border border-[#9A7B38]/50 flex items-center justify-center text-[#C4AD83] shrink-0">
                        {isChapOpen ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </button>

                    {/* LEVEL 1 BODY: List of Level-2 Sections */}
                    {isChapOpen && (
                      <div className="p-4 pt-0 space-y-2.5 border-t border-[#263140]">
                        <div className="pt-3 space-y-2.5">
                          {filteredArticles.map((art) => {
                            const { preambleLines, subArticles } =
                              extractArticleStructure(art);
                            const isArtOpen = q
                              ? true
                              : !!expandedArticles[art.id];
                            const isEditingThis =
                              editingArticleKey?.chapterId === chap.id &&
                              editingArticleKey?.articleId === art.id;

                            return (
                              <div
                                key={art.id}
                                className="wax-recess border border-[#5E481E]/80 overflow-hidden"
                              >
                                {/* LEVEL 2: Section / Article Header (e.g., Статья 8. Почётная знать, государственные награды и титулы Понта) */}
                                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#121820] transition-colors">
                                  <button
                                    type="button"
                                    onClick={() => toggleArticle(art.id)}
                                    className="flex-1 text-left flex flex-wrap items-center gap-2 cursor-pointer"
                                  >
                                    <span className="font-epigraphic text-xs font-bold text-[#C4AD83]">
                                      {art.number}.
                                    </span>
                                    <span className="font-display text-sm sm:text-base font-bold text-[#E6E0D0]">
                                      {art.title}
                                    </span>
                                    {subArticles.length > 0 && (
                                      <span className="px-2 py-0.5 rounded bg-[#1B232E] border border-[#9A7B38]/40 text-[10px] font-epigraphic text-[#C2B280]">
                                        Статей внутри: {subArticles.length}
                                      </span>
                                    )}
                                  </button>

                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    {isGmMode && !isEditingThis && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            sound.playStoneTap();
                                            setEditingArticleKey({
                                              chapterId: chap.id,
                                              articleId: art.id,
                                            });
                                            setEditArtNum(art.number);
                                            setEditArtTitle(art.title);
                                            setEditArtText(art.text);
                                            setEditArtClausesText(
                                              (art.clauses || []).join('\n\n')
                                            );
                                            setExpandedArticles((prev) => ({
                                              ...prev,
                                              [art.id]: true,
                                            }));
                                          }}
                                          className="px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9E8658]/60 text-[11px] font-epigraphic text-[#C4AD83] flex items-center gap-1 cursor-pointer"
                                          title="Редактировать раздел"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          <span>Изменить</span>
                                        </button>

                                        {onDeleteLawArticle && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              sound.playStoneTap();
                                              onDeleteLawArticle(
                                                chap.id,
                                                art.id
                                              );
                                            }}
                                            className="px-2.5 py-1 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-[11px] font-epigraphic text-[#F1A9B2] hover:text-white flex items-center gap-1 cursor-pointer"
                                            title="Удалить раздел"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Удалить</span>
                                          </button>
                                        )}
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => toggleArticle(art.id)}
                                      className="text-xs font-epigraphic text-[#C2B280] flex items-center gap-1 cursor-pointer"
                                    >
                                      {isArtOpen ? (
                                        <>
                                          <span>Свернуть раздел</span>
                                          <ChevronDown className="w-4 h-4 text-[#C4AD83]" />
                                        </>
                                      ) : (
                                        <>
                                          <span>Открыть раздел</span>
                                          <ChevronRight className="w-4 h-4 text-[#C2B280]" />
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* LEVEL 2 BODY: Collapsible Level-3 Sub-articles (e.g., 1. Государственные награды) */}
                                {isArtOpen && (
                                  <div className="px-3.5 pb-3.5 pt-2.5 border-t border-[#263140]/80 space-y-2 text-sm text-[#E2DAC2] leading-relaxed">
                                    {isEditingThis ? (
                                      <div className="space-y-3 pt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                          <div className="wax-recess px-2.5 py-1.5">
                                            <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                              Номер раздела
                                            </label>
                                            <input
                                              type="text"
                                              value={editArtNum}
                                              onChange={(e) =>
                                                setEditArtNum(e.target.value)
                                              }
                                              className="w-full bg-transparent text-xs text-[#C4AD83] focus:outline-none"
                                            />
                                          </div>
                                          <div className="sm:col-span-2 wax-recess px-2.5 py-1.5">
                                            <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                              Заголовок раздела
                                            </label>
                                            <input
                                              type="text"
                                              value={editArtTitle}
                                              onChange={(e) =>
                                                setEditArtTitle(e.target.value)
                                              }
                                              className="w-full bg-transparent text-xs text-[#E6E0D0] focus:outline-none"
                                            />
                                          </div>
                                        </div>

                                        <div className="wax-recess p-2.5">
                                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                            Первая статья раздела (с подпунктами)
                                          </label>
                                          <textarea
                                            rows={4}
                                            value={editArtText}
                                            onChange={(e) =>
                                              setEditArtText(e.target.value)
                                            }
                                            className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                                          />
                                        </div>

                                        <div className="wax-recess p-2.5">
                                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                            Остальные статьи раздела (разделяйте пустой строкой)
                                          </label>
                                          <textarea
                                            rows={5}
                                            value={editArtClausesText}
                                            onChange={(e) =>
                                              setEditArtClausesText(
                                                e.target.value
                                              )
                                            }
                                            placeholder="2. Название статьи..."
                                            className="w-full bg-transparent text-xs text-[#C2B280] focus:outline-none resize-none"
                                          />
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingArticleKey(null)
                                            }
                                            className="min-h-[36px] px-3 py-1 rounded btn-basalt-stele text-xs flex items-center gap-1 cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                            <span>Отмена</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!onUpdateLawArticle) return;
                                              sound.playWaxSeal();
                                              const nextClauses =
                                                editArtClausesText
                                                  .split(/\n\s*\n/)
                                                  .map((s) => s.trim())
                                                  .filter(Boolean);
                                              onUpdateLawArticle(
                                                chap.id,
                                                art.id,
                                                {
                                                  number:
                                                    editArtNum.trim() ||
                                                    art.number,
                                                  title:
                                                    editArtTitle.trim() ||
                                                    art.title,
                                                  text:
                                                    editArtText.trim() ||
                                                    art.text,
                                                  clauses: nextClauses,
                                                }
                                              );
                                              setEditingArticleKey(null);
                                            }}
                                            className="min-h-[36px] px-3.5 py-1 rounded btn-golden-stater text-xs flex items-center gap-1 cursor-pointer"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Сохранить раздел</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {/* Optional introductory preamble (or flat list like Табель о рангах) */}
                                        {preambleLines.length > 0 && (
                                          <div className="px-2 py-1.5">
                                            <FormattedClauseLines
                                              lines={preambleLines}
                                            />
                                          </div>
                                        )}

                                        {/* LEVEL 3: Collapsible Sub-articles (1., 2., 3., Этап 1., Шаблон №1.) */}
                                        {subArticles.length > 0 && (
                                          <div className="space-y-2">
                                            {subArticles.map((sub) => {
                                              if (
                                                q &&
                                                !subArticleMatchesQuery(sub, q) &&
                                                !art.title
                                                  .toLowerCase()
                                                  .includes(q) &&
                                                !art.number
                                                  .toLowerCase()
                                                  .includes(q)
                                              ) {
                                                return null;
                                              }

                                              const isSubOpen = q
                                                ? true
                                                : !!expandedSubArticles[sub.id];

                                              return (
                                                <div
                                                  key={sub.id}
                                                  className="rounded bg-[#141B24] border border-[#9A7B38]/45 overflow-hidden"
                                                >
                                                  {/* Level-3 Sub-article Accordion Button */}
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      toggleSubArticle(sub.id)
                                                    }
                                                    className="w-full px-3 py-2 text-left flex items-center justify-between gap-3 hover:bg-[#1B232E] transition-colors cursor-pointer"
                                                  >
                                                    <div className="flex items-baseline gap-2">
                                                      <span className="font-epigraphic text-xs sm:text-sm font-bold text-[#C4AD83] shrink-0">
                                                        {sub.marker}
                                                      </span>
                                                      <span className="font-display text-sm sm:text-base font-semibold text-[#E6E0D0]">
                                                        {sub.title}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[11px] font-epigraphic text-[#C2B280] shrink-0">
                                                      <span>
                                                        {isSubOpen
                                                          ? 'Свернуть'
                                                          : 'Развернуть'}
                                                      </span>
                                                      {isSubOpen ? (
                                                        <ChevronDown className="w-4 h-4 text-[#C4AD83]" />
                                                      ) : (
                                                        <ChevronRight className="w-4 h-4 text-[#C2B280]" />
                                                      )}
                                                    </div>
                                                  </button>

                                                  {/* Level-3 Sub-article Body: Non-collapsible inner clauses (a., b., i., ii., —) */}
                                                  {isSubOpen && (
                                                    <div className="px-3.5 pb-3 pt-2 border-t border-[#263140]/70 space-y-1.5 bg-[#0F141C]">
                                                      {sub.bodyLines.length >
                                                        0 && (
                                                        <FormattedClauseLines
                                                          lines={sub.bodyLines}
                                                        />
                                                      )}
                                                      {sub.childNodes &&
                                                        sub.childNodes.length >
                                                          0 && (
                                                          <div className="space-y-1.5">
                                                            {sub.childNodes.map(
                                                              (child) => (
                                                                <LawNodeView
                                                                  key={child.id}
                                                                  node={child}
                                                                />
                                                              )
                                                            )}
                                                          </div>
                                                        )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SUBVIEW 2: MINI-WIKI OF PONTUS (Citizen Memo, RP Rules, Economy, Lore, Peoples) */
          <div className="mt-5 space-y-6">
            {/* Callout to reopen interactive Nationality & Name Generator */}
            <div className="p-4 rounded bg-[#1B232E] border border-[#9E8658] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#E6E0D0]">
                  Интерактивная Обучалка и Генератор Имён по Народностям
                </h3>
                <p className="text-xs sm:text-sm text-[#C2B280]">
                  Хотите посмотреть большие списки греческих, скифских, персидских, армянских и черкесско-колхидских имён или сгенерировать внешность и предысторию?
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playCoinClink();
                  onOpenOnboardingGuide();
                }}
                className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                Открыть Обучалку и Генератор
              </button>
            </div>

            {/* FULL CITIZEN MEMO GUIDE (ПАМЯТКА ГРАЖДАНИНА ПОНТА) */}
            <div className="p-5 sm:p-6 rounded bg-[#1B232E] border-2 border-[#9E8658] votive-glow space-y-4">
              <div>
                <LaurelHeaderDivider label={CITIZEN_MEMO_GUIDE.subtitle} />
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#E6E0D0] mt-2">
                  {CITIZEN_MEMO_GUIDE.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#C2B280] mt-1 leading-relaxed">
                  {CITIZEN_MEMO_GUIDE.intro}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CITIZEN_MEMO_GUIDE.sections.map((sec) => (
                  <div
                    key={sec.number}
                    className="wax-recess p-4 border border-[#5E481E] space-y-2"
                  >
                    <h4 className="font-display text-base sm:text-lg font-bold text-[#C4AD83]">
                      {sec.number}. {sec.title}
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                      {sec.paragraphs.map((par, pIdx) => (
                        <p key={pIdx} className="whitespace-pre-line">
                          {par}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wiki Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wikiSections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-2.5"
                >
                  <span className="font-epigraphic text-xs uppercase text-[#C4AD83]">
                    Раздел Вики · {sec.category}
                  </span>
                  <h4 className="font-display text-xl font-bold text-[#E6E0D0]">
                    {sec.title}
                  </h4>
                  <p className="text-xs text-[#C2B280]">{sec.summary}</p>
                  <MeanderDivider />
                  <div className="space-y-2 text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                    {sec.content.map((par, i) => (
                      <p key={i}>{par}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Reference Summary of All Peoples of Pontus */}
            <div className="space-y-3">
              <h3 className="font-display text-xl font-bold text-[#E6E0D0]">
                Справочник Народов Понта и Соседних Земель
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {NATIONALITIES_DATA.map((nat) => (
                  <div
                    key={nat.id}
                    className="wax-recess p-4 border border-[#5E481E] space-y-2"
                  >
                    <span className="text-[10px] font-epigraphic text-[#C4AD83]">
                      {nat.greekSubtitle}
                    </span>
                    <h4 className="font-display text-base font-bold text-[#E6E0D0]">
                      {nat.name}
                    </h4>
                    <p className="text-xs text-[#C2B280]">
                      <strong>Ареал:</strong> {nat.homeland}
                    </p>
                    <p className="text-xs text-[#E2DAC2] leading-relaxed">
                      {nat.summary}
                    </p>
                    <p className="text-[11px] text-[#C2B280] pt-1">
                      <strong>Примеры имён (М):</strong> {nat.maleNames.slice(0, 6).join(', ')}...
                    </p>
                    <p className="text-[11px] text-[#C2B280]">
                      <strong>Примеры имён (Ж):</strong> {nat.femaleNames.slice(0, 5).join(', ')}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
