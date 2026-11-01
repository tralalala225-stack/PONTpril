import React, { useState } from 'react';
import { LawChapter, WikiSection } from '../types/rpTypes';
import { NATIONALITIES_DATA } from '../data/nationalitiesData';
import { MeanderDivider, WaxSealBadge } from './PonticPrimitives';
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

  // Track expanded chapters & expanded individual articles
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'chap-1': true,
    'chap-2': true,
    'chap-3': false,
    'chap-4': false,
  });

  const [expandedArticles, setExpandedArticles] = useState<Record<string, boolean>>({
    'art-1-1': true,
    'art-1-2': true,
    'art-1-3': true,
    'art-2-1': true,
    'art-2-2': true,
  });

  // GM add law article state
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [targetChapId, setTargetChapId] = useState<string>(
    lawChapters[0]?.id || 'chap-1'
  );
  const [newArtNum, setNewArtNum] = useState('Статья 11');
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

  const expandAll = () => {
    sound.playStoneTap();
    const chaps: Record<string, boolean> = {};
    const arts: Record<string, boolean> = {};
    lawChapters.forEach((c) => {
      chaps[c.id] = true;
      c.articles.forEach((a) => {
        arts[a.id] = true;
      });
    });
    setExpandedChapters(chaps);
    setExpandedArticles(arts);
  };

  const collapseAll = () => {
    sound.playStoneTap();
    const chaps: Record<string, boolean> = {};
    const arts: Record<string, boolean> = {};
    lawChapters.forEach((c) => {
      chaps[c.id] = false;
      c.articles.forEach((a) => {
        arts[a.id] = false;
      });
    });
    setExpandedChapters(chaps);
    setExpandedArticles(arts);
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
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F3E5AB] mt-0.5">
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
                  ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
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
                  ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Мини-Вики (Правила РП и Народы)</span>
            </button>
          </div>
        </div>

        {/* SUBVIEW 1: BOOK OF LAWS & COLLAPSIBLE CONSTITUTION */}
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
                  placeholder="Поиск по главам, номерам статей и тексту основного закона..."
                  className="w-full bg-transparent text-sm text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronsUpDown className="w-4 h-4 text-[#E5C158]" />
                  <span>Развернуть все главы и статьи</span>
                </button>

                <button
                  type="button"
                  onClick={collapseAll}
                  className="min-h-[38px] px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronsDownUp className="w-4 h-4 text-[#C2B280]" />
                  <span>Свернуть все</span>
                </button>

                {isGmMode && (
                  <button
                    type="button"
                    onClick={() => setShowAddArticle(!showAddArticle)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Добавить статью закона (ГМ)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Chapter Jump Pills */}
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
                  className="px-3 py-1.5 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#9A7B38]/50 text-xs font-epigraphic text-[#F3E5AB] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {chap.romanNumeral}: {chap.title.split('(')[0]}
                </button>
              ))}
            </div>

            {/* GM Add Law Article Form */}
            {isGmMode && showAddArticle && (
              <form
                onSubmit={handleCreateArticle}
                className="p-4 rounded bg-[#1B232E] border border-[#D4AF37] space-y-3"
              >
                <h4 className="font-display text-base font-bold text-[#F3E5AB]">
                  Внести новую статью в Книгу Законов (Режим ГМ)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                      Раздел / Глава
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <select
                        value={targetChapId}
                        onChange={(e) => setTargetChapId(e.target.value)}
                        className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none"
                      >
                        {lawChapters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.romanNumeral} — {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                      Номер статьи
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        value={newArtNum}
                        onChange={(e) => setNewArtNum(e.target.value)}
                        placeholder="Статья 11"
                        className="w-full bg-transparent text-xs text-[#E5C158] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-epigraphic text-[#C2B280] uppercase mb-1">
                      Заголовок статьи *
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        required
                        value={newArtTitle}
                        onChange={(e) => setNewArtTitle(e.target.value)}
                        placeholder="О морских займах и поручительстве"
                        className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
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
                    placeholder="Основной текст статьи закона..."
                    className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                  />
                </div>
                <div className="wax-recess px-2.5 py-1.5">
                  <input
                    type="text"
                    value={newArtClause}
                    onChange={(e) => setNewArtClause(e.target.value)}
                    placeholder="Дополнительный параграф (по желанию, напр. § 11.1...)"
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

            {/* Collapsible Chapters & Collapsible Articles */}
            <div className="space-y-4">
              {lawChapters.map((chap) => {
                const filteredArticles = chap.articles.filter(
                  (art) =>
                    !q ||
                    art.title.toLowerCase().includes(q) ||
                    art.text.toLowerCase().includes(q) ||
                    art.number.toLowerCase().includes(q) ||
                    (art.clauses &&
                      art.clauses.some((cl) => cl.toLowerCase().includes(q)))
                );

                if (q && filteredArticles.length === 0) return null;

                const isChapOpen = q ? true : !!expandedChapters[chap.id];

                return (
                  <div
                    key={chap.id}
                    id={`law-${chap.id}`}
                    className="rounded bg-[#1B232E] border border-[#9A7B38]/60 overflow-hidden"
                  >
                    {/* Chapter Header Accordion Button */}
                    <button
                      type="button"
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-[#263140]/70 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-epigraphic text-xs uppercase tracking-widest text-[#E5C158] font-bold">
                          {chap.romanNumeral} · Статей: {filteredArticles.length}
                        </span>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-[#F3E5AB] mt-0.5">
                          {chap.title}
                        </h3>
                        <p className="text-xs text-[#C2B280] mt-0.5">{chap.subtitle}</p>
                      </div>
                      <div className="w-9 h-9 rounded bg-[#121820] border border-[#9A7B38]/50 flex items-center justify-center text-[#E5C158] shrink-0">
                        {isChapOpen ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </button>

                    {/* Chapter Body: List of Collapsible Articles */}
                    {isChapOpen && (
                      <div className="p-4 pt-0 space-y-2.5 border-t border-[#263140]">
                        <div className="pt-3 space-y-2.5">
                          {filteredArticles.map((art) => {
                            const isArtOpen = q
                              ? true
                              : expandedArticles[art.id] !== false;
                            const isEditingThis =
                              editingArticleKey?.chapterId === chap.id &&
                              editingArticleKey?.articleId === art.id;

                            return (
                              <div
                                key={art.id}
                                className="wax-recess border border-[#5E481E]/80 overflow-hidden"
                              >
                                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 hover:bg-[#121820] transition-colors">
                                  <button
                                    type="button"
                                    onClick={() => toggleArticle(art.id)}
                                    className="flex-1 text-left flex flex-wrap items-center gap-2 cursor-pointer"
                                  >
                                    <span className="font-epigraphic text-xs font-bold text-[#E5C158]">
                                      {art.number}.
                                    </span>
                                    <span className="font-display text-sm sm:text-base font-bold text-[#F3E5AB]">
                                      {art.title}
                                    </span>
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
                                              (art.clauses || []).join('\n')
                                            );
                                            setExpandedArticles((prev) => ({
                                              ...prev,
                                              [art.id]: true,
                                            }));
                                          }}
                                          className="px-2.5 py-1 rounded bg-[#1B232E] hover:bg-[#263140] border border-[#D4AF37]/60 text-[11px] font-epigraphic text-[#E5C158] flex items-center gap-1 cursor-pointer"
                                          title="Редактировать статью закона"
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
                                            title="Удалить статью закона"
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
                                          <span>Свернуть</span>
                                          <ChevronDown className="w-4 h-4 text-[#E5C158]" />
                                        </>
                                      ) : (
                                        <>
                                          <span>Развернуть</span>
                                          <ChevronRight className="w-4 h-4 text-[#C2B280]" />
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {isArtOpen && (
                                  <div className="px-4 pb-3.5 pt-2 border-t border-[#263140]/80 space-y-2 text-sm text-[#E2DAC2] leading-relaxed">
                                    {isEditingThis ? (
                                      <div className="space-y-3 pt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                          <div className="wax-recess px-2.5 py-1.5">
                                            <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                              Номер статьи
                                            </label>
                                            <input
                                              type="text"
                                              value={editArtNum}
                                              onChange={(e) =>
                                                setEditArtNum(e.target.value)
                                              }
                                              className="w-full bg-transparent text-xs text-[#E5C158] focus:outline-none"
                                            />
                                          </div>
                                          <div className="sm:col-span-2 wax-recess px-2.5 py-1.5">
                                            <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                              Заголовок статьи
                                            </label>
                                            <input
                                              type="text"
                                              value={editArtTitle}
                                              onChange={(e) =>
                                                setEditArtTitle(e.target.value)
                                              }
                                              className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                                            />
                                          </div>
                                        </div>

                                        <div className="wax-recess p-2.5">
                                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                            Основной текст статьи закона
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={editArtText}
                                            onChange={(e) =>
                                              setEditArtText(e.target.value)
                                            }
                                            className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none resize-none"
                                          />
                                        </div>

                                        <div className="wax-recess p-2.5">
                                          <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-0.5">
                                            Параграфы / подпункты (каждый с новой строки)
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={editArtClausesText}
                                            onChange={(e) =>
                                              setEditArtClausesText(
                                                e.target.value
                                              )
                                            }
                                            placeholder="§ 1.1 ..."
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
                                                  .split('\n')
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
                                            <span>Сохранить статью</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p>{art.text}</p>
                                        {art.clauses &&
                                          art.clauses.length > 0 && (
                                            <div className="pl-3 border-l border-[#9A7B38]/60 space-y-1.5 text-xs sm:text-sm text-[#C2B280]">
                                              {art.clauses.map((cl, idx) => (
                                                <p key={idx}>{cl}</p>
                                              ))}
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
          /* SUBVIEW 2: MINI-WIKI OF PONTUS (RP Rules, Economy, Lore, Peoples) */
          <div className="mt-5 space-y-6">
            {/* Callout to reopen interactive Nationality & Name Generator */}
            <div className="p-4 rounded bg-[#1B232E] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#F3E5AB]">
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

            {/* Wiki Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wikiSections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-2.5"
                >
                  <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                    Раздел Вики · {sec.category}
                  </span>
                  <h4 className="font-display text-xl font-bold text-[#F3E5AB]">
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
              <h3 className="font-display text-xl font-bold text-[#F3E5AB]">
                Справочник Народов Понта и Соседних Земель
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {NATIONALITIES_DATA.map((nat) => (
                  <div
                    key={nat.id}
                    className="wax-recess p-4 border border-[#5E481E] space-y-2"
                  >
                    <span className="text-[10px] font-epigraphic text-[#E5C158]">
                      {nat.greekSubtitle}
                    </span>
                    <h4 className="font-display text-base font-bold text-[#F3E5AB]">
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
