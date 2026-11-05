import React, { useState } from 'react';
import {
  CharacterSheet,
  GameMemberRole,
  PolisData,
} from '../types/rpTypes';
import {
  LaurelHeaderDivider,
  LaurelWreathBadge,
  MeanderDivider,
  WaxSealBadge,
} from './PonticPrimitives';
import { sound } from '../utils/sound';
import {
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  MapPin,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';

interface PendingApprovalRegistryViewProps {
  characters: CharacterSheet[];
  poleis: PolisData[];
  isGmOrCreator: boolean;
  currentUserRole: GameMemberRole;
  currentUserId: string | null;
  onApproveCharacter: (charId: string, gmNote?: string) => void;
  onRejectCharacter: (charId: string, gmNote: string) => void;
  onDeleteCharacter: (charId: string) => void;
  onOpenCreateCharacter: () => void;
  onJumpToPolis: (polisId: string) => void;
}

export const PendingApprovalRegistryView: React.FC<
  PendingApprovalRegistryViewProps
> = ({
  characters,
  poleis,
  isGmOrCreator,
  currentUserRole,
  currentUserId,
  onApproveCharacter,
  onRejectCharacter,
  onDeleteCharacter,
  onOpenCreateCharacter,
  onJumpToPolis,
}) => {
  const [filterMode, setFilterMode] = useState<'pending' | 'rejected' | 'all'>(
    'pending'
  );
  const [selectedId, setSelectedId] = useState<string>('');
  const [gmNoteDraft, setGmNoteDraft] = useState<string>('');

  const pendingCharacters = characters.filter(
    (c) => !c.isDeceased && c.approvalStatus === 'pending'
  );
  const rejectedCharacters = characters.filter(
    (c) => !c.isDeceased && c.approvalStatus === 'rejected'
  );
  const allCreatedLiving = characters.filter((c) => !c.isDeceased);

  const displayedList =
    filterMode === 'pending'
      ? pendingCharacters
      : filterMode === 'rejected'
        ? rejectedCharacters
        : allCreatedLiving;

  const inspectedChar =
    displayedList.find((c) => c.id === selectedId) || displayedList[0];

  const getPolisName = (polisId: string) =>
    poleis.find((p) => p.id === polisId)?.name || polisId;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="stele-panel p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#263140] pb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <LaurelWreathBadge size="md" tone="gold">
              <ShieldCheck className="w-5 h-5 text-[#C4AD83]" />
            </LaurelWreathBadge>
            <div>
              <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
                Цензорская Коллегия Понта · Проверка перед вводом в игру
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#E6E0D0] mt-0.5">
                Реестр Созданных Персонажей (На Проверке ГМа)
              </h2>
              <p className="text-xs sm:text-sm text-[#C2B280] mt-1">
                После создания новая анкета замораживается до проверки. Для разморозки и допуска персонажа к экономике, полисам и голосованиям достаточно одобрения одного ГМа.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setFilterMode('pending');
              }}
              className={`min-h-[44px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                filterMode === 'pending'
                  ? 'bg-[#263140] text-[#C4AD83] border-[#9E8658]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <Clock className="w-4 h-4 text-[#C4AD83]" />
              <span>Ожидают проверки ({pendingCharacters.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setFilterMode('rejected');
              }}
              className={`min-h-[44px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                filterMode === 'rejected'
                  ? 'bg-[#8B2635] text-[#E6E0D0] border-[#C0392B]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>На доработке ({rejectedCharacters.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setFilterMode('all');
              }}
              className={`min-h-[44px] px-4 py-2 rounded text-xs font-epigraphic flex items-center gap-2 cursor-pointer border transition-colors ${
                filterMode === 'all'
                  ? 'bg-[#263140] text-[#C4AD83] border-[#9E8658]'
                  : 'bg-[#1B232E] text-[#C2B280] border-[#263140] hover:text-[#E6E0D0]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Все созданные ({allCreatedLiving.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playCoinClink();
                onOpenCreateCharacter();
              }}
              className="min-h-[44px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Подать Новую Анкету</span>
            </button>
          </div>
        </div>

        {/* Status Info Bar on Role from game_members */}
        <div className="p-3.5 rounded bg-[#1B232E] border border-[#9A7B38]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-epigraphic uppercase text-[#C2B280]">
              Ваш статус проверки в Supabase (`game_members`):
            </span>
            <span
              className={`font-epigraphic font-bold ${
                currentUserRole === 'creator' || currentUserRole === 'gm'
                  ? 'text-[#8EBDA2]'
                  : 'text-[#C2B280]'
              }`}
            >
              {currentUserRole === 'creator' || currentUserRole === 'gm'
                ? 'ГЕЙМ-МАСТЕР (Право одобрения анкет)'
                : isGmOrCreator
                  ? 'РЕЖИМ ГМ (Право одобрения активно)'
                  : 'ИГРОК (Просмотр очереди анкет)'}
            </span>
            {currentUserId && (
              <span className="text-[11px] text-[#7C786A] font-mono">
                · ID: {currentUserId.slice(0, 8)}...
              </span>
            )}
          </div>
          <span className="text-[#C4AD83] font-epigraphic">
            Правило: 1 подпись ГМа размораживает персонажа
          </span>
        </div>

        {/* Main Content Grid */}
        {displayedList.length === 0 ? (
          <div className="wax-recess p-8 text-center space-y-3">
            <Clock className="w-8 h-8 text-[#C4AD83] mx-auto opacity-80" />
            <h3 className="font-display text-xl font-bold text-[#E6E0D0]">
              {filterMode === 'pending'
                ? 'Сейчас нет замороженных анкет, ожидающих проверки ГМа'
                : filterMode === 'rejected'
                  ? 'Нет отклонённых анкет'
                  : 'Список созданных анкет пуст'}
            </h3>
            <p className="text-xs sm:text-sm text-[#C2B280] max-w-lg mx-auto">
              Когда игрок создаёт нового персонажа, анкета сначала попадает сюда в замороженном виде для проверки квенты, внешности и стартового имущества Гейм-Мастером.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
            {/* Left 5 cols: Queue List */}
            <div className="lg:col-span-5 space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {displayedList.map((char) => {
                const isSelected = inspectedChar?.id === char.id;
                const status = char.approvalStatus || 'approved';

                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      sound.playStoneTap();
                      setSelectedId(char.id);
                    }}
                    className={`p-4 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1B232E] border-[#9E8658] votive-glow'
                        : 'bg-[#121820] border-[#263140] hover:border-[#9A7B38]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {char.portraitUrl ? (
                          <img
                            src={char.portraitUrl}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-14 rounded object-cover border border-[#9E8658] shrink-0 bg-[#0B0F14]"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded border border-[#9A7B38]/60 bg-[#0B0F14] flex items-center justify-center font-display text-lg font-bold text-[#C4AD83] shrink-0">
                            {char.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-epigraphic">
                            {status === 'pending' && (
                              <span className="text-[#C4AD83] font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>ЗАМОРОЖЕНА (ЖДЁТ ГМ)</span>
                              </span>
                            )}
                            {status === 'rejected' && (
                              <span className="text-[#F1A9B2] font-bold">
                                НА ДОРАБОТКЕ
                              </span>
                            )}
                            {status === 'approved' && (
                              <span className="text-[#8EBDA2] font-bold">
                                ОДОБРЕНА В РП
                              </span>
                            )}
                            <span aria-hidden="true" className="text-[#7C786A]">
                              ·
                            </span>
                            <span className="text-[#C2B280]">
                              {getPolisName(char.currentPolisId)}
                            </span>
                            <span aria-hidden="true" className="text-[#7C786A]">
                              ·
                            </span>
                            <span className="text-[#C4AD83]">
                              Анкета:{' '}
                              {char.ownerVkName ||
                                char.economy?.ownerVkName ||
                                (char.ownerVkId || char.economy?.ownerVkId
                                  ? `id${
                                      char.ownerVkId || char.economy?.ownerVkId
                                    }`
                                  : 'Участник ВК')}
                            </span>
                          </div>

                          <h3 className="font-display text-base sm:text-lg font-bold text-[#E6E0D0] mt-0.5 truncate">
                            {char.name}
                          </h3>
                          <p className="text-xs text-[#C2B280] truncate">
                            {char.nationality} · {char.position}
                          </p>
                        </div>
                      </div>

                      <span className="font-epigraphic text-xs font-bold text-[#C4AD83] tabular-nums shrink-0">
                        {char.drachmas} др.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 7 cols: Detailed Inspection & GM Approval Controls */}
            <div className="lg:col-span-7">
              {inspectedChar && (
                <div className="bg-[#1B232E] border border-[#9E8658]/70 rounded p-5 sm:p-6 space-y-5">
                  <LaurelHeaderDivider
                    label={
                      inspectedChar.approvalStatus === 'pending'
                        ? 'Анкета Заморожена · Ожидает Одобрения ГМа'
                        : inspectedChar.approvalStatus === 'rejected'
                          ? 'Анкета Возвращена на Доработку'
                          : 'Анкета Проверена и Допущена в Игру'
                    }
                  />

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#263140] pb-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {inspectedChar.portraitUrl ? (
                        <div className="w-28 h-36 rounded border-2 border-[#9E8658] overflow-hidden shrink-0 bg-[#0B0F14]">
                          <img
                            src={inspectedChar.portraitUrl}
                            alt={inspectedChar.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-36 rounded border-2 border-dashed border-[#9A7B38] bg-[#0B0F14] flex flex-col items-center justify-center text-[#C4AD83] shrink-0">
                          <span className="font-display text-3xl font-bold">
                            {inspectedChar.name.charAt(0)}
                          </span>
                          <span className="text-[10px] font-epigraphic text-[#C2B280] mt-1">
                            Без портрета
                          </span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic text-[#C2B280]">
                          <span>{inspectedChar.nationality}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {inspectedChar.gender}, {inspectedChar.age} лет
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#C4AD83]">
                            Создана: {inspectedChar.createdAt}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#8EBDA2] font-bold">
                            Анкета:{' '}
                            {inspectedChar.ownerVkName ||
                              inspectedChar.economy?.ownerVkName ||
                              (inspectedChar.ownerVkId ||
                              inspectedChar.economy?.ownerVkId
                                ? `id${
                                    inspectedChar.ownerVkId ||
                                    inspectedChar.economy?.ownerVkId
                                  }`
                                : 'Участник ВК')}
                          </span>
                        </div>

                        <h3 className="font-display text-2xl font-bold text-[#E6E0D0]">
                          {inspectedChar.name}
                        </h3>

                        <p className="text-sm text-[#C4AD83] font-epigraphic">
                          {inspectedChar.status} · {inspectedChar.position}
                        </p>
                        <p className="text-xs text-[#C2B280]">
                          Партия / Род: {inspectedChar.nobleHouseOrParty}
                        </p>

                        <div className="pt-1 flex flex-wrap items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onJumpToPolis(inspectedChar.currentPolisId)
                            }
                            className="text-[#8EBDA2] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>
                              Начальный полис:{' '}
                              {getPolisName(inspectedChar.currentPolisId)}
                            </span>
                          </button>
                          <span className="text-[#C4AD83] font-bold tabular-nums">
                            Стартовый кошель: {inspectedChar.drachmas} драхм
                          </span>
                        </div>
                      </div>
                    </div>

                    <WaxSealBadge
                      sigil={
                        inspectedChar.approvalStatus === 'approved'
                          ? 'EUPATOR'
                          : 'STRATIOS'
                      }
                      size="md"
                    />
                  </div>

                  {/* Questionnaire Details */}
                  <div className="space-y-4 text-sm">
                    <div className="wax-recess p-3.5">
                      <span className="block font-epigraphic text-xs uppercase text-[#C4AD83] mb-1">
                        Внешность и Приметы:
                      </span>
                      <p className="text-[#E2DAC2] leading-relaxed">
                        {inspectedChar.appearance || 'Не указано'}
                      </p>
                    </div>

                    <div className="wax-recess p-3.5">
                      <span className="block font-epigraphic text-xs uppercase text-[#C4AD83] mb-1">
                        Характер и Убеждения:
                      </span>
                      <p className="text-[#E2DAC2] leading-relaxed">
                        {inspectedChar.personality || 'Не указано'}
                      </p>
                    </div>

                    <div className="wax-recess p-3.5">
                      <span className="block font-epigraphic text-xs uppercase text-[#C4AD83] mb-1">
                        Предыстория (Биография до начала РП):
                      </span>
                      <p className="text-[#E2DAC2] leading-relaxed">
                        {inspectedChar.backstory || 'Не указано'}
                      </p>
                    </div>

                    {(inspectedChar.inventory || []).length > 0 && (
                      <div className="wax-recess p-3.5 space-y-2">
                        <span className="block font-epigraphic text-xs uppercase text-[#8EBDA2]">
                          Заявленное стартовое имущество (
                          {(inspectedChar.inventory || []).length}):
                        </span>
                        {(inspectedChar.inventory || []).map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-[#263140] pt-2"
                          >
                            <div>
                              <strong className="text-[#E6E0D0]">
                                {item.name}
                              </strong>{' '}
                              <span className="text-[#C2B280]">
                                ({item.quantity} {item.unit}) —{' '}
                                {item.acquisitionMethod}
                              </span>
                            </div>
                            <span className="text-[#C4AD83] font-bold tabular-nums">
                              Оценка: {item.marketPriceDrachmas * item.quantity}{' '}
                              др.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {inspectedChar.gmApprovalNote && (
                    <div className="p-3.5 rounded bg-[#121820] border border-[#9E8658]/60 text-xs">
                      <span className="block font-epigraphic uppercase text-[#C4AD83] mb-1">
                        Вердикт / Примечание Гейм-Мастера:
                      </span>
                      <p className="text-[#E6E0D0]">
                        {inspectedChar.gmApprovalNote}
                      </p>
                    </div>
                  )}

                  <MeanderDivider />

                  {/* GM / Creator Verification Decision Controls */}
                  {isGmOrCreator ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                          Комментарий ГМа при проверке анкеты (необязательно для одобрения):
                        </label>
                        <div className="wax-recess px-3 py-2">
                          <input
                            type="text"
                            value={gmNoteDraft}
                            onChange={(e) => setGmNoteDraft(e.target.value)}
                            placeholder="Напр.: Квента соответствует канону Синопы, стартовый капитал подтверждён..."
                            className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playOracleChime();
                              onApproveCharacter(
                                inspectedChar.id,
                                gmNoteDraft.trim() ||
                                  'Одобрено Гейм-Мастером и введено в РП'
                              );
                              setGmNoteDraft('');
                            }}
                            className="min-h-[44px] px-5 py-2.5 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Разморозить и Одобрить в Игру (1 ГМ)
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              sound.playStoneTap();
                              onRejectCharacter(
                                inspectedChar.id,
                                gmNoteDraft.trim() ||
                                  'Отправлено ГМом на доработку биографии или имущества'
                              );
                              setGmNoteDraft('');
                            }}
                            className="min-h-[44px] px-4 py-2.5 rounded btn-sacrificial text-xs flex items-center gap-2 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Вернуть на доработку</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            sound.playStoneTap();
                            onDeleteCharacter(inspectedChar.id);
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-xs font-epigraphic text-[#F1A9B2] hover:text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Удалить анкету</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded bg-[#121820] border border-[#263140] text-xs text-[#C2B280] flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-[#C4AD83] shrink-0" />
                      <span>
                        Вы просматриваете реестр созданных анкет как игрок. Одобрить и разморозить персонажа может любой Гейм-Мастер (`gm`).
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
