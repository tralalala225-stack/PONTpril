import React, { useState } from 'react';
import {
  AgoraContract,
  CharacterEconomyProfile,
  CharacterInventoryItem,
  CharacterSheet,
  EconomyOperationLogEntry,
  GlobalEconomyState,
  HorosDebtRecord,
  OikosEstate,
  PolisData,
  PoliticalEconomyPendulum,
  ResidencyStatus,
  SlaveMarketRegime,
  TechneSpecialty,
  WealthTierId,
} from '../types/rpTypes';
import {
  ARMENIAN_SYNDICATE_GOODS,
  buildGeneratedStarterPackage,
  calculateCharacterWealthAndTax,
  formatVkOperationStamp,
  generateOperationCode,
  getDefaultCharacterEconomy,
  getSlaveUnitPrice,
  OIKOS_ESTATE_CATALOG,
  ORIGIN_STORY_MODIFIERS,
  rollRandomGoodsForBudget,
  TECHNE_RECIPES,
  WEALTH_PRESETS,
} from '../data/economyCodexData';
import { LaurelHeaderDivider, LaurelWreathBadge } from './PonticPrimitives';
import { sound } from '../utils/sound';
import {
  AlertTriangle,
  Anchor,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Dices,
  Flame,
  Hammer,
  Home,
  Landmark,
  PlusCircle,
  RotateCcw,
  Scale,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

interface StarterWealthGeneratorBoxProps {
  polisId: string;
  polisName: string;
  nationality: string;
  initialResidency?: ResidencyStatus;
  initialWealthTier?: WealthTierId;
  initialSlaves?: number;
  initialDrachmas?: number;
  compactTitle?: string;
  onApplyGeneratedPackage: (pkg: {
    drachmas: number;
    status: string;
    position: string;
    economy: CharacterEconomyProfile;
    inventory: CharacterInventoryItem[];
  }) => void;
}

const TECHNE_SPECIALTIES_LIST: TechneSpecialty[] = [
  'Кузнечное дело и броня (Халибия)',
  'Корабельное плотничество (Синопа)',
  'Виноделие, масло и амфоры',
  'Ткачество, пурпур и ювелирка',
  'Врачевание и териаки',
];

export const StarterWealthGeneratorBox: React.FC<
  StarterWealthGeneratorBoxProps
> = ({
  polisId,
  polisName,
  nationality,
  initialWealthTier = 'oikos_citizen',
  compactTitle,
  onApplyGeneratedPackage,
}) => {
  const [selectedPresetId, setSelectedPresetId] =
    useState<WealthTierId>(initialWealthTier);
  const [selectedOriginModId, setSelectedOriginModId] =
    useState<string>('local_hereditary');

  const currentPreset =
    WEALTH_PRESETS.find((p) => p.id === selectedPresetId) || WEALTH_PRESETS[2];
  const currentMod =
    ORIGIN_STORY_MODIFIERS.find((m) => m.id === selectedOriginModId) ||
    ORIGIN_STORY_MODIFIERS[0];

  // Fine-tuning states
  const [customResidency, setCustomResidency] = useState<ResidencyStatus>(
    currentMod.residency
  );
  const [customOriginTag, setCustomOriginTag] = useState<string>(
    currentMod.originStoryTag
  );
  const [customDrachmas, setCustomDrachmas] = useState<number>(
    Math.max(10, currentPreset.defaultDrachmas + currentMod.drachmasBonusDelta)
  );
  const [customSlaves, setCustomSlaves] = useState<number>(
    Math.max(
      0,
      Math.min(15, currentPreset.defaultSlavesCount + currentMod.slavesBonusDelta)
    )
  );
  const [customEstateIds, setCustomEstateIds] = useState<string[]>(
    currentPreset.defaultEstateTemplateIds
  );
  const [customSpecialty, setCustomSpecialty] = useState<TechneSpecialty>(
    'Виноделие, масло и амфоры'
  );
  const [customTechneLevel, setCustomTechneLevel] = useState<number>(
    currentPreset.defaultTechneLevel
  );
  const [itemBudget, setItemBudget] = useState<number>(
    currentPreset.itemBudgetDrachmas
  );
  const [rolledItem, setRolledItem] = useState<CharacterInventoryItem>(() =>
    rollRandomGoodsForBudget(currentPreset.itemBudgetDrachmas, polisName)
  );
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const handleSelectWealthPreset = (presetId: WealthTierId) => {
    sound.playStoneTap();
    setSelectedPresetId(presetId);
    const p = WEALTH_PRESETS.find((x) => x.id === presetId) || WEALTH_PRESETS[2];
    setCustomDrachmas(
      Math.max(10, p.defaultDrachmas + currentMod.drachmasBonusDelta)
    );
    setCustomSlaves(
      Math.max(0, Math.min(15, p.defaultSlavesCount + currentMod.slavesBonusDelta))
    );
    setCustomEstateIds(p.defaultEstateTemplateIds.slice(0, 2));
    setCustomTechneLevel(p.defaultTechneLevel);
    setItemBudget(p.itemBudgetDrachmas);
    setRolledItem(rollRandomGoodsForBudget(p.itemBudgetDrachmas, polisName));
  };

  const handleSelectOriginModifier = (modId: string) => {
    sound.playStoneTap();
    setSelectedOriginModId(modId);
    const mod =
      ORIGIN_STORY_MODIFIERS.find((m) => m.id === modId) ||
      ORIGIN_STORY_MODIFIERS[0];
    setCustomResidency(mod.residency);
    setCustomOriginTag(mod.originStoryTag);
    setCustomDrachmas(
      Math.max(10, currentPreset.defaultDrachmas + mod.drachmasBonusDelta)
    );
    setCustomSlaves(
      Math.max(
        0,
        Math.min(15, currentPreset.defaultSlavesCount + mod.slavesBonusDelta)
      )
    );
  };

  const handleRollNewGoodsOnBudget = (budgetToUse?: number) => {
    sound.playCoinClink();
    const targetBudget = budgetToUse ?? itemBudget;
    setRolledItem(rollRandomGoodsForBudget(targetBudget, polisName));
  };

  const handleToggleEstateTemplate = (tplId: string) => {
    sound.playStoneTap();
    setCustomEstateIds((prev) => {
      if (prev.includes(tplId)) {
        return prev.filter((id) => id !== tplId);
      }
      if (prev.length >= 2) {
        return [prev[1], tplId];
      }
      return [...prev, tplId];
    });
  };

  const handleRandomizeWealthAndOrigin = () => {
    sound.playCoinClink();
    const randomPreset =
      WEALTH_PRESETS[Math.floor(Math.random() * WEALTH_PRESETS.length)];
    const randomMod =
      ORIGIN_STORY_MODIFIERS[
        Math.floor(Math.random() * ORIGIN_STORY_MODIFIERS.length)
      ];
    const randomSpec =
      TECHNE_SPECIALTIES_LIST[
        Math.floor(Math.random() * TECHNE_SPECIALTIES_LIST.length)
      ];
    setSelectedPresetId(randomPreset.id);
    setSelectedOriginModId(randomMod.id);
    setCustomResidency(randomMod.residency);
    setCustomOriginTag(randomMod.originStoryTag);
    setCustomDrachmas(
      Math.max(10, randomPreset.defaultDrachmas + randomMod.drachmasBonusDelta)
    );
    setCustomSlaves(
      Math.max(
        0,
        Math.min(
          15,
          randomPreset.defaultSlavesCount + randomMod.slavesBonusDelta
        )
      )
    );
    setCustomEstateIds(randomPreset.defaultEstateTemplateIds.slice(0, 2));
    setCustomSpecialty(randomSpec);
    setCustomTechneLevel(randomPreset.defaultTechneLevel);
    setItemBudget(randomPreset.itemBudgetDrachmas);
    setRolledItem(
      rollRandomGoodsForBudget(randomPreset.itemBudgetDrachmas, polisName)
    );
  };

  const handleApply = () => {
    sound.playWaxSeal();
    const pkg = buildGeneratedStarterPackage({
      presetId: selectedPresetId,
      originModifierId: selectedOriginModId,
      polisId,
      polisName,
      nationality,
      customSlavesCount: customSlaves,
      customDrachmas,
      customTechneSpecialty: customSpecialty,
      customTechneLevel,
      customEstateTemplateIds: customEstateIds,
      customRandomItem: rolledItem,
    });
    pkg.economy.residencyStatus = customResidency;
    pkg.economy.originStoryTag = customOriginTag.trim() || currentMod.originStoryTag;

    onApplyGeneratedPackage(pkg);
    setAppliedBanner(
      `Применено: ${customResidency} · ${pkg.drachmas} др. · Товар: «${rolledItem.name}» (${rolledItem.quantity} ${rolledItem.unit}) · Ремесло: ${customSpecialty} (${customTechneLevel} ур.)`
    );
  };

  return (
    <div className="p-4 sm:p-5 rounded bg-[#1B232E] border-2 border-[#D4AF37] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-3.5">
        <div>
          <span className="font-epigraphic text-xs uppercase tracking-wider text-[#E5C158] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {compactTitle ||
                'Генератор Класса Гражданина (от Бедняка до Зажиточного), Происхождения, Навыка Ремесла и Случайного Товара на Сумму'}
            </span>
          </span>
          <p className="text-xs text-[#C2B280] mt-1">
            Выберите класс персонажа (от бедняка до умеренно зажиточного домохозяина), укажите местный вы или приезжий, выберите ремесло и сгенерируйте случайный товар на положенную сумму!
          </p>
        </div>

        <button
          type="button"
          onClick={handleRandomizeWealthAndOrigin}
          className="min-h-[40px] px-3.5 py-2 rounded btn-basalt-stele text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Dices className="w-4 h-4 text-[#E5C158]" />
          <span>Случайный Класс, Ремесло и Товар</span>
        </button>
      </div>

      {/* Step 1: 4 Класса Гражданина (От Бедняка до Умеренно Зажиточного) */}
      <div className="space-y-2">
        <label className="block font-epigraphic text-xs uppercase text-[#F3E5AB]">
          Шаг 1. Выберите класс достатка (от бедняка до зажиточного домохозяина — без перегиба):
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {WEALTH_PRESETS.map((preset) => {
            const active = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectWealthPreset(preset.id)}
                className={`p-3.5 rounded text-left border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#263140] border-[#D4AF37] votive-glow'
                    : 'bg-[#121820] border-[#263140] hover:border-[#9A7B38]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-epigraphic text-[10px] uppercase text-[#E5C158] font-bold">
                    {preset.badgeText}
                  </span>
                </div>
                <div className="font-display text-sm sm:text-base font-bold text-[#F3E5AB] mt-0.5">
                  {preset.title}
                </div>
                <p className="text-xs text-[#C2B280] mt-1 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Местный или Неместный (Модификаторы происхождения) */}
      <div className="space-y-2">
        <label className="block font-epigraphic text-xs uppercase text-[#F3E5AB]">
          Шаг 2. Местный (Полит) или Неместный (Приезжий метек / приплыл с рабами или кладью):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ORIGIN_STORY_MODIFIERS.map((mod) => {
            const active = selectedOriginModId === mod.id;
            const isLocal = mod.residency === 'Местный гражданин (Полит)';
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleSelectOriginModifier(mod.id)}
                className={`p-3 rounded text-left border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#263140] border-[#D4AF37] votive-glow'
                    : 'bg-[#121820] border-[#263140] hover:border-[#9A7B38]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-epigraphic uppercase">
                  <span
                    className={
                      isLocal ? 'text-[#8EBDA2] font-bold' : 'text-[#E5C158] font-bold'
                    }
                  >
                    {mod.residency}
                  </span>
                  {(mod.slavesBonusDelta !== 0 || mod.drachmasBonusDelta !== 0) && (
                    <span className="px-1.5 py-0.5 rounded bg-[#0B0F14] text-[#F3E5AB]">
                      {mod.slavesBonusDelta > 0 ? `+${mod.slavesBonusDelta} раб.` : ''}{' '}
                      {mod.drachmasBonusDelta > 0
                        ? `+${mod.drachmasBonusDelta} др.`
                        : mod.drachmasBonusDelta < 0
                          ? `${mod.drachmasBonusDelta} др.`
                          : ''}
                    </span>
                  )}
                </div>
                <div className="font-display text-xs sm:text-sm font-bold text-[#F3E5AB] mt-1">
                  {mod.label}
                </div>
                <p className="text-[11px] text-[#C2B280] mt-1 line-clamp-2">
                  {mod.originStoryTag}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Рандомный Товар на Сумму + Навык Ремесла (Технэ) */}
      <div className="p-3.5 rounded bg-[#121820] border border-[#D4AF37]/60 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#263140] pb-2.5">
          <div>
            <span className="font-epigraphic text-xs uppercase text-[#E5C158] font-bold">
              Шаг 3. Случайный стартовый товар на сумму класса (~{itemBudget} др.) и Навык Ремесла:
            </span>
            <p className="text-[11px] text-[#C2B280] mt-0.5">
              Генератор автоматически подбирает случайный товар в инвентарь ровно под ваш бюджет достатка. Нажмите кнопку справа, чтобы выбросить другой товар на эту сумму!
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleRollNewGoodsOnBudget(itemBudget)}
            className="min-h-[38px] px-3.5 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Dices className="w-4 h-4" />
            <span>Другой случайный товар на ~{itemBudget} др.</span>
          </button>
        </div>

        {/* Rolled Item Card */}
        <div className="p-3 rounded bg-[#1B232E] border border-[#9A7B38]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-epigraphic uppercase text-[#E5C158]">
              <span>Выпавший товар ({rolledItem.category})</span>
              <span>·</span>
              <span className="text-[#8EBDA2]">
                Рыночная стоимость партии: ~
                {rolledItem.quantity * rolledItem.marketPriceDrachmas} драхм
              </span>
            </div>
            <div className="font-display text-sm sm:text-base font-bold text-[#F3E5AB]">
              {rolledItem.name} — {rolledItem.quantity} {rolledItem.unit}
            </div>
            <p className="text-xs text-[#C2B280]">
              {rolledItem.acquisitionMethod}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="font-epigraphic text-[10px] uppercase text-[#C2B280]">
              Сумма товара (др.):
            </label>
            <div className="wax-recess px-2.5 py-1.5 w-24">
              <input
                type="number"
                min={15}
                max={600}
                value={itemBudget}
                onChange={(e) => {
                  const val = Math.max(15, Math.min(600, Number(e.target.value) || 30));
                  setItemBudget(val);
                  setRolledItem(rollRandomGoodsForBudget(val, polisName));
                }}
                className="w-full bg-transparent text-xs font-bold text-[#E5C158] text-center tabular-nums focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Fine-tuning: Specialty, Level, Slaves, Drachmas, Residency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block font-epigraphic text-[10px] uppercase text-[#C2B280] mb-1">
              Ремесленный навык (Технэ)
            </label>
            <div className="wax-recess px-2.5 py-2">
              <select
                value={customSpecialty}
                onChange={(e) =>
                  setCustomSpecialty(e.target.value as TechneSpecialty)
                }
                className="w-full bg-[#0B0F14] text-xs text-[#F3E5AB] focus:outline-none cursor-pointer"
              >
                {TECHNE_SPECIALTIES_LIST.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-epigraphic text-[10px] uppercase text-[#C2B280] mb-1">
              Уровень ремесла (1–3 на старте)
            </label>
            <div className="wax-recess px-2.5 py-2">
              <select
                value={customTechneLevel}
                onChange={(e) => setCustomTechneLevel(Number(e.target.value))}
                className="w-full bg-[#0B0F14] text-xs text-[#E5C158] font-bold focus:outline-none cursor-pointer"
              >
                <option value={1}>1 ур. — Ученик</option>
                <option value={2}>2 ур. — Подмастерье</option>
                <option value={3}>3 ур. — Мастер</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-epigraphic text-[10px] uppercase text-[#C2B280] mb-1">
              Стартовые рабы (0–15)
            </label>
            <div className="wax-recess px-2.5 py-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={15}
                value={customSlaves}
                onChange={(e) =>
                  setCustomSlaves(
                    Math.max(0, Math.min(15, Number(e.target.value) || 0))
                  )
                }
                className="w-full bg-transparent text-xs font-bold text-[#E5C158] tabular-nums focus:outline-none"
              />
              <span className="text-[11px] text-[#C2B280]">душ</span>
            </div>
          </div>

          <div>
            <label className="block font-epigraphic text-[10px] uppercase text-[#C2B280] mb-1">
              Кошель (Драхмы)
            </label>
            <div className="wax-recess px-2.5 py-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={2000}
                value={customDrachmas}
                onChange={(e) =>
                  setCustomDrachmas(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full bg-transparent text-xs font-bold text-[#8EBDA2] tabular-nums focus:outline-none"
              />
              <span className="text-[11px] text-[#C2B280]">др.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <label className="block font-epigraphic text-[10px] uppercase text-[#C2B280] mb-1">
              Правовой статус (Местный / Приезжий)
            </label>
            <div className="wax-recess px-2.5 py-2">
              <select
                value={customResidency}
                onChange={(e) =>
                  setCustomResidency(e.target.value as ResidencyStatus)
                }
                className="w-full bg-[#0B0F14] text-xs text-[#F3E5AB] focus:outline-none cursor-pointer"
              >
                <option value="Местный гражданин (Полит)">
                  Местный гражданин (Полит)
                </option>
                <option value="Приезжий / Неместный (Метек / Ксен)">
                  Приезжий / Неместный (Метек / Ксен)
                </option>
                <option value="Вольноотпущенник / Кабальный">
                  Вольноотпущенник / Кабальный
                </option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-8">
            <label className="block font-epigraphic text-[10px] uppercase text-[#C2B280] mb-1">
              Уточнение судьбы (напр. «Неместный, приплыл на судне с 2 рабами и товаром»):
            </label>
            <div className="wax-recess px-3 py-2">
              <input
                type="text"
                value={customOriginTag}
                onChange={(e) => setCustomOriginTag(e.target.value)}
                placeholder="Напр.: Приплыл на торговом судне с рабами и запасом амфор..."
                className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Выбор начальных владений Ойкоса (0, 1 или 2 участка) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="font-epigraphic text-[10px] uppercase text-[#C2B280]">
              Стартовые владения Ойкоса (выберите от 0 до 2 владений по Ст. 25 Конституции):
            </label>
            {customEstateIds.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomEstateIds([])}
                className="text-[11px] text-[#F1A9B2] hover:underline cursor-pointer"
              >
                Убрать все владения (начать без недвижимости)
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {OIKOS_ESTATE_CATALOG.map((tpl) => {
              const picked = customEstateIds.includes(tpl.id);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleToggleEstateTemplate(tpl.id)}
                  className={`p-2.5 rounded border text-left text-xs transition-all cursor-pointer ${
                    picked
                      ? 'bg-[#263140] border-[#D4AF37] text-[#F3E5AB]'
                      : 'bg-[#0B0F14] border-[#263140] text-[#C2B280] hover:border-[#9A7B38]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-epigraphic">
                    <span className="text-[#E5C158]">
                      Ур. {tpl.tier} · макс. {tpl.maxSlaves} раб.
                    </span>
                    {picked && <Check className="w-3.5 h-3.5 text-[#8EBDA2]" />}
                  </div>
                  <div className="font-semibold mt-0.5 line-clamp-1">
                    {tpl.name}
                  </div>
                  <div className="text-[10px] text-[#8EBDA2] mt-0.5">
                    Оценка: {tpl.purchaseValueDrachmas} др. · До +
                    {tpl.maxSlaves * tpl.incomePerSlave} др./цикл
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {appliedBanner ? (
          <span className="text-xs text-[#8EBDA2] flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{appliedBanner}</span>
          </span>
        ) : (
          <span className="text-xs text-[#C2B280]">
            Нажмите кнопку справа, чтобы закрепить выбранный класс, товар на сумму ~{itemBudget} др., навык ремесла и Ойкос!
          </span>
        )}

        <button
          type="button"
          onClick={handleApply}
          className="min-h-[44px] px-5 py-2.5 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Применить Класс, Случайный Товар и Ремесло</span>
        </button>
      </div>
    </div>
  );
};

export const SimpleEconomyGuideBlock: React.FC = () => {
  return (
    <div className="p-4 sm:p-5 rounded bg-[#1B232E] border-2 border-[#D4AF37] space-y-4">
      <div className="border-b border-[#263140] pb-3">
        <span className="font-epigraphic text-xs uppercase tracking-wider text-[#E5C158] flex items-center gap-1.5 font-bold">
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Обучение Экономике Понта — все правила простыми словами (без сложных схем)</span>
        </span>
        <p className="text-xs sm:text-sm text-[#E2DAC2] mt-1 leading-relaxed">
          В основе экономики Понта лежит простая античная идея: <strong className="text-[#F3E5AB]">богатый живёт рентой с хозяйства (Ойкоса) и рабов</strong>, чтобы иметь свободное время для политики и войн, а <strong className="text-[#F3E5AB]">бедняк или мастер зарабатывает своими руками, ремеслом и подрядами</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
        {/* Card 1 */}
        <div className="p-3.5 rounded bg-[#121820] border border-[#263140] space-y-1.5">
          <div className="font-epigraphic uppercase text-[#8EBDA2] font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4 shrink-0" />
            <span>1. Местный или Приезжий и 4 класса старта</span>
          </div>
          <p className="text-[#E2DAC2] leading-relaxed">
            При создании анкеты вы выбираете класс от <strong>Бедняка (45 др.)</strong> до <strong>Умеренно Зажиточного (420 др.)</strong> и получаете <strong>случайный товар на сумму класса</strong>.
          </p>
          <p className="text-[#C2B280] leading-relaxed">
            • <strong>Местный гражданин (Полит)</strong> может свободно владеть землёй и получать выплаты из Казны.<br />
            • <strong>Неместный (Метек)</strong> может приплыть со своими рабами и товаром, держать лавки и корабли, но платит небольшой налог (12 др.) и пошлину за покупку земли.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-3.5 rounded bg-[#121820] border border-[#263140] space-y-1.5">
          <div className="font-epigraphic uppercase text-[#E5C158] font-bold flex items-center gap-1.5">
            <Home className="w-4 h-4 shrink-0" />
            <span>2. Ойкос (Хозяйство) и Рабы vs Ручной труд</span>
          </div>
          <p className="text-[#E2DAC2] leading-relaxed">
            По Ст. 25 Конституции можно владеть максимум <strong>2 предприятиями Ойкоса</strong> и до <strong>15 рабами</strong>.
          </p>
          <p className="text-[#C2B280] leading-relaxed">
            • <strong>Есть рабы?</strong> Они приносят вам ренту (+50–60 др. за раба), минус их прокорм. Если рабов больше 5 — нужен надсмотрщик, иначе раб может сбежать.<br />
            • <strong>Нет рабов?</strong> Крупное поместье встаёт в простой (0 др.), и вам нужно нажать <strong>«Трудиться своими руками»</strong> (+45–75 др.).
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-3.5 rounded bg-[#121820] border border-[#263140] space-y-1.5">
          <div className="font-epigraphic uppercase text-[#E5C158] font-bold flex items-center gap-1.5">
            <Hammer className="w-4 h-4 shrink-0" />
            <span>3. Ремесло «Технэ» (1–5 ур.) и Шедевры</span>
          </div>
          <p className="text-[#E2DAC2] leading-relaxed">
            У каждого героя есть профессия (кузнец, корабел, винодел, ткач или лекарь) и уровень от 1 до 5.
          </p>
          <p className="text-[#C2B280] leading-relaxed">
            • Вкладывая драхмы в сырьё (до 3 раз за цикл), вы создаёте ценные изделия.<br />
            • При ковке система бросает жребий: возможен <strong>Брак</strong>, <strong>Обычный успех</strong> или <strong>★ Шедевр Мастера</strong> (стоит вдвое дороже!). Чем выше ваш уровень, тем чаще выходят шедевры.
          </p>
        </div>

        {/* Card 4 */}
        <div className="p-3.5 rounded bg-[#121820] border border-[#263140] space-y-1.5">
          <div className="font-epigraphic uppercase text-[#E5C158] font-bold flex items-center gap-1.5">
            <Scale className="w-4 h-4 shrink-0" />
            <span>4. Заказы Агоры, Долги «Орос» и Армяне</span>
          </div>
          <p className="text-[#E2DAC2] leading-relaxed">
            Нужны быстрые деньги? Берите <strong>Подряды на Агоре</strong> от государства или богатых игроков (+140–165 др. и опыт ремесла).
          </p>
          <p className="text-[#C2B280] leading-relaxed">
            • Если денег не хватает — можно взять ссуду у менял под <strong>долговой камень «Орос»</strong> (до 12%). Воины могут списать 60% долга за службу у Стратега!<br />
            • <strong>Армянский Синдикат</strong> даёт скидку <strong>-40%</strong> на восточный шёлк, скакунов и самоцветы.
          </p>
        </div>

        {/* Card 5 */}
        <div className="p-3.5 rounded bg-[#121820] border border-[#263140] space-y-1.5">
          <div className="font-epigraphic uppercase text-[#E5C158] font-bold flex items-center gap-1.5">
            <Coins className="w-4 h-4 shrink-0" />
            <span>5. Сырьё Городов и Караваны со Стражей</span>
          </div>
          <p className="text-[#E2DAC2] leading-relaxed">
            В каждом из 4 полисов (Синопа, Опиу, Никомедион, Кратополь) своё дешёвое местное сырьё.
          </p>
          <p className="text-[#C2B280] leading-relaxed">
            • Покупайте товар там, где он дешёв, и отправляйте <strong>Караван</strong> в соседний полис с наценкой.<br />
            • В пути есть риск пиратов и разбойников (18%), но если <strong>нанять стражу каравана (35 др.)</strong> — риск падает почти до нуля (3%)!
          </p>
        </div>

        {/* Card 6 */}
        <div className="p-3.5 rounded bg-[#121820] border border-[#D4AF37]/70 space-y-1.5">
          <div className="font-epigraphic uppercase text-[#F3E5AB] font-bold flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-[#E5C158] shrink-0" />
            <span>6. Коды `PN-XXXXXXXX` для Бесед ВК</span>
          </div>
          <p className="text-[#E2DAC2] leading-relaxed">
            Никакого ожидания проверки от админов: деньги и товары начисляются вам <strong>мгновенно</strong>!
          </p>
          <p className="text-[#C2B280] leading-relaxed">
            • После любого действия приложение выдаёт готовое клеймо с кодом, например: <code className="text-[#E5C158]">[КОД: PN-48291034]</code>.<br />
            • Вы нажимаете <strong>«Скопировать для ВК»</strong> и вставляете эту строчку в конец своего РП-поста в беседе ВК. Всё честно и прозрачно!
          </p>
        </div>
      </div>
    </div>
  );
};

interface EconomyCodexPanelProps {
  character: CharacterSheet;
  poleis: PolisData[];
  globalEconomy: GlobalEconomyState;
  isGmMode: boolean;
  onUpdateCharacter: (
    charId: string,
    updates: Partial<CharacterSheet>
  ) => void;
  onUpdateGlobalEconomy: (next: GlobalEconomyState) => void;
  onRecordPolisChronicle?: (
    polisId: string,
    title: string,
    summary: string
  ) => void;
}

export const EconomyCodexPanel: React.FC<EconomyCodexPanelProps> = ({
  character,
  poleis,
  globalEconomy,
  isGmMode,
  onUpdateCharacter,
  onUpdateGlobalEconomy,
  onRecordPolisChronicle,
}) => {
  const [codexTab, setCodexTab] = useState<
    'oikos' | 'techne' | 'agora_syndicate' | 'audit_treasury'
  >('oikos');
  const [showWealthGenerator, setShowWealthGenerator] =
    useState<boolean>(false);
  const [showEconomyGuide, setShowEconomyGuide] = useState<boolean>(false);

  // Latest generated operation code stamp for 1-click VK copy
  const [latestStamp, setLatestStamp] = useState<{
    code: string;
    vkText: string;
    summary: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Craft feedback
  const [craftFeedback, setCraftFeedback] = useState<{
    outcome: 'БРАК' | 'ОБЫЧНЫЙ УСПЕХ' | 'ШЕДЕВР МАСТЕРА!';
    text: string;
    code: string;
  } | null>(null);

  // New Agora contract form state
  const [showNewContractForm, setShowNewContractForm] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [contractDesc, setContractDesc] = useState('');
  const [contractReward, setContractReward] = useState<number>(120);
  const [contractHashtag, setContractHashtag] = useState('#Агора_Синопы');

  // New Horos Loan state
  const [loanAmount, setLoanAmount] = useState<number>(200);
  const [loanCreditor, setLoanCreditor] = useState<string>(
    'Трапеза Армянского Синдиката в Синопе'
  );

  // Audit search filter
  const [auditSearch, setAuditSearch] = useState<string>('');

  const currentPolis =
    poleis.find((p) => p.id === character.currentPolisId) || poleis[0];
  const econ: CharacterEconomyProfile =
    character.economy || getDefaultCharacterEconomy(character);
  const isFrozenPending = character.approvalStatus === 'pending';

  const calc = calculateCharacterWealthAndTax(
    character,
    globalEconomy.politicalPendulum,
    globalEconomy.slaveMarketRegime
  );

  const slaveUnitPrice = getSlaveUnitPrice(
    globalEconomy.slaveMarketRegime,
    globalEconomy.politicalPendulum
  );

  const isArmenianOrSyndicate =
    Boolean(econ.isArmenianSyndicateMember) ||
    character.nationality.toLowerCase().includes('армян');

  // Helper to log an operation with an 8-digit code PN-XXXXXXXX
  const recordOperationWithCode = (params: {
    operationType: EconomyOperationLogEntry['operationType'];
    locationHashtag: string;
    summary: string;
    drachmasDelta: number;
    itemAdded?: CharacterInventoryItem;
    itemRemovedId?: string;
    treasuryDelta?: number;
    slavePoolDelta?: number;
    updatedContracts?: AgoraContract[];
  }) => {
    const code = generateOperationCode();
    const vkText = formatVkOperationStamp({
      characterName: character.name,
      polisName: currentPolis.name,
      locationHashtag: params.locationHashtag,
      code,
      summary: params.summary,
    });

    const newEntry: EconomyOperationLogEntry = {
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      characterId: character.id,
      characterName: character.name,
      polisName: currentPolis.name,
      locationHashtag: params.locationHashtag,
      operationType: params.operationType,
      summary: params.summary,
      drachmasDelta: params.drachmasDelta,
      itemAdded: params.itemAdded,
      itemRemovedId: params.itemRemovedId,
      createdAt: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'active',
    };

    setLatestStamp({
      code,
      vkText,
      summary: params.summary,
    });

    onUpdateGlobalEconomy({
      ...globalEconomy,
      treasuryDrachmas: Math.max(
        0,
        globalEconomy.treasuryDrachmas + (params.treasuryDelta || 0)
      ),
      slaveMarketPool: Math.max(
        0,
        globalEconomy.slaveMarketPool + (params.slavePoolDelta || 0)
      ),
      agoraContracts: params.updatedContracts || globalEconomy.agoraContracts,
      operationLogs: [newEntry, ...(globalEconomy.operationLogs || [])].slice(
        0,
        120
      ),
    });

    return code;
  };

  // 1. Collect Oikos Rent (or suffer slave escape if >5 slaves without overseer)
  const handleCollectOikosRent = () => {
    if (isFrozenPending) return;
    sound.playCoinClink();

    let updatedSlaves = econ.slavesCount;
    let revoltNote = '';
    if (calc.slaveRevoltRiskPercent > 0) {
      const roll = Math.random() * 100;
      if (roll < calc.slaveRevoltRiskPercent && updatedSlaves > 1) {
        updatedSlaves -= 1;
        revoltNote =
          ' [ВНИМАНИЕ: из-за отсутствия надсмотрщика 1 раб бежал в горы!]';
      }
    }

    const netDelta = calc.netRentIncome;
    const nextDrachmas = Math.max(0, character.drachmas + netDelta);

    const summary = `Сбор ренты Ойкоса (${econ.estates.length} влад., ${econ.slavesCount} раб.): вал +${calc.grossEstateRent} др., содержание и налог Эйсфора (${calc.eisphoraRatePercent}% = ${calc.eisphoraTaxAmount} др. в Казну) -${calc.totalUpkeepAndTaxes} др. Чистый итог: ${netDelta >= 0 ? `+${netDelta}` : netDelta} др.${revoltNote}`;

    recordOperationWithCode({
      operationType: 'rent',
      locationHashtag: `#Ойкос_${currentPolis.name}`,
      summary,
      drachmasDelta: netDelta,
      treasuryDelta: calc.eisphoraTaxAmount + calc.metoikionTax,
    });

    onUpdateCharacter(character.id, {
      drachmas: nextDrachmas,
      economy: {
        ...econ,
        slavesCount: updatedSlaves,
        craftsThisCycle: 0, // Сбор ренты / смена цикла обновляет лимит ковки!
        lastRentCollectedAt: new Date().toLocaleTimeString('ru-RU'),
      },
    });
  };

  // 2. Manual Labor (Аутургос / Фет — когда нет рабов или на малом участке)
  const handleManualLabor = () => {
    if (isFrozenPending) return;
    sound.playCoinClink();

    const hasTier1 = econ.estates.some((e) => e.tier === 1);
    const basePay = hasTier1 ? 65 : 45;
    const skillBonus = econ.techneLevel * 8;
    const metoikionDeduct =
      econ.residencyStatus === 'Приезжий / Неместный (Метек / Ксен)' ? 6 : 0;
    const netEarned = basePay + skillBonus - metoikionDeduct;

    const summary = hasTier1
      ? `Личный труд хозяина-аутургоса на своём наделе/лавке I уровня (+${netEarned} др.)`
      : `Ручной труд свободного батрака/ремесленника в порту и мастерских полиса ${currentPolis.name} (+${netEarned} др.)`;

    recordOperationWithCode({
      operationType: 'manual_labor',
      locationHashtag: `#Труд_${currentPolis.name}`,
      summary,
      drachmasDelta: netEarned,
      treasuryDelta: metoikionDeduct,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas + netEarned,
      economy: {
        ...econ,
        techneXp: econ.techneXp + 10,
        craftsThisCycle: 0,
      },
    });
  };

  // 3. Buy or Sell Slaves (Max 15 per Art. 25)
  const handleBuySlave = (qty: number) => {
    if (isFrozenPending) return;
    const allowedQty = Math.min(
      qty,
      15 - econ.slavesCount,
      globalEconomy.slaveMarketPool
    );
    if (allowedQty <= 0) return;
    const totalCost = slaveUnitPrice * allowedQty;
    if (character.drachmas < totalCost) return;

    sound.playCoinClink();
    const marketTax = Math.round(totalCost * 0.1);
    const summary = `Покупка ${allowedQty} раб. на Невольничьем рынке (Квартал РАБЫ) за ${totalCost} др. (пошлина ${marketTax} др. в Казну). Штат рабов: ${econ.slavesCount + allowedQty}/15.`;

    recordOperationWithCode({
      operationType: 'slave_market',
      locationHashtag: '#Синопа #Квартал_РАБЫ',
      summary,
      drachmasDelta: -totalCost,
      treasuryDelta: marketTax,
      slavePoolDelta: -allowedQty,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas - totalCost,
      economy: {
        ...econ,
        slavesCount: econ.slavesCount + allowedQty,
      },
    });
  };

  const handleSellSlave = (qty: number) => {
    if (isFrozenPending || econ.slavesCount < qty) return;
    sound.playCoinClink();
    const sellUnit = Math.round(slaveUnitPrice * 0.85);
    const totalPayout = sellUnit * qty;

    const summary = `Продажа ${qty} раб. из своего Ойкоса на Невольничьем рынке за +${totalPayout} др. Осталось рабов: ${econ.slavesCount - qty}/15.`;

    recordOperationWithCode({
      operationType: 'slave_market',
      locationHashtag: '#Синопа #Квартал_РАБЫ',
      summary,
      drachmasDelta: totalPayout,
      slavePoolDelta: qty,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas + totalPayout,
      economy: {
        ...econ,
        slavesCount: econ.slavesCount - qty,
      },
    });
  };

  // 4. Buy or Sell Oikos Estate (Max 2 per Art. 25)
  const handleBuyEstate = (tplId: string) => {
    if (isFrozenPending || econ.estates.length >= 2) return;
    const tpl = OIKOS_ESTATE_CATALOG.find((e) => e.id === tplId);
    if (!tpl) return;

    // Non-citizen land restriction check (unless buying urban workshop/ship or paying proxenia fee)
    const isNonCitizenBuyingLand =
      econ.residencyStatus !== 'Местный гражданин (Полит)' &&
      !tpl.allowsNonCitizenWithoutProxenia;
    const proxeniaFee = isNonCitizenBuyingLand ? 120 : 0;
    const totalCost = tpl.purchaseValueDrachmas + proxeniaFee;

    if (character.drachmas < totalCost) return;
    sound.playWaxSeal();

    const newEstate: OikosEstate = {
      id: `est-${Date.now()}`,
      name: tpl.name,
      tier: tpl.tier,
      category: tpl.category,
      polisId: character.currentPolisId,
      purchaseValueDrachmas: tpl.purchaseValueDrachmas,
      baseManualIncome: tpl.baseManualIncome,
      incomePerSlave: tpl.incomePerSlave,
      maxSlaves: tpl.maxSlaves,
      assignedSlaves: Math.min(tpl.maxSlaves, econ.slavesCount),
    };

    const summary = `Приобретение владения Ойкоса «${tpl.name}» в полисе ${currentPolis.name} за ${totalCost} др.${proxeniaFee > 0 ? ` (включая пошлину проксении ${proxeniaFee} др. в Казну)` : ''}`;

    recordOperationWithCode({
      operationType: 'rent',
      locationHashtag: `#Агора_${currentPolis.name}`,
      summary,
      drachmasDelta: -totalCost,
      treasuryDelta: Math.round(tpl.purchaseValueDrachmas * 0.05) + proxeniaFee,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas - totalCost,
      economy: {
        ...econ,
        estates: [...econ.estates, newEstate],
      },
    });
  };

  const handleSellEstate = (estateId: string) => {
    const target = econ.estates.find((e) => e.id === estateId);
    if (!target) return;
    sound.playCoinClink();
    const sellValue = Math.round(target.purchaseValueDrachmas * 0.8);

    const summary = `Продажа владения Ойкоса «${target.name}» за +${sellValue} др.`;
    recordOperationWithCode({
      operationType: 'rent',
      locationHashtag: `#Агора_${currentPolis.name}`,
      summary,
      drachmasDelta: sellValue,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas + sellValue,
      economy: {
        ...econ,
        estates: econ.estates.filter((e) => e.id !== estateId),
      },
    });
  };

  // 5. Craft Recipe (Techne 1-5 with Roll Outcomes embedded in PN-XXXXXXXX)
  const handleCraftRecipe = (recipeId: string) => {
    if (isFrozenPending) return;
    const recipe = TECHNE_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    if (econ.techneLevel < recipe.minLevel) return;
    if (econ.craftsThisCycle >= 3) return;
    if (character.drachmas < recipe.materialCostDrachmas) return;

    sound.playCoinClink();

    // Roll 1..100 modified by Techne Level (1..5) and slaves in workshop
    const roll = Math.floor(Math.random() * 100) + 1;
    const failThreshold = Math.max(0, 22 - econ.techneLevel * 5); // Lvl 1: 17%, Lvl 2: 12%, Lvl 3: 7%, Lvl 4: 2%, Lvl 5: 0%
    const masterpieceThreshold = 96 - econ.techneLevel * 5; // Lvl 1: 91+, Lvl 3: 81+, Lvl 5: 71+

    let outcome: 'БРАК' | 'ОБЫЧНЫЙ УСПЕХ' | 'ШЕДЕВР МАСТЕРА!' = 'ОБЫЧНЫЙ УСПЕХ';
    let createdItem: CharacterInventoryItem | undefined;
    let xpEarned = recipe.xpGain;

    if (roll <= failThreshold) {
      outcome = 'БРАК';
      xpEarned = Math.round(recipe.xpGain * 0.4);
    } else if (roll >= masterpieceThreshold) {
      outcome = 'ШЕДЕВР МАСТЕРА!';
      xpEarned = Math.round(recipe.xpGain * 1.5);
      createdItem = {
        id: `inv-craft-${Date.now()}`,
        name: `★ ШЕДЕВР: ${recipe.baseOutputName} (Клеймо мастера ${character.name.split(' ')[0]})`,
        category: recipe.outputCategory,
        quantity: 1,
        unit: recipe.outputUnit,
        acquisitionMethod: `Выковано/создано в мастерской (${recipe.specialty}, Ур. ${econ.techneLevel}) — ИСХОД: ШЕДЕВР МАСТЕРА`,
        purchasePriceDrachmas: recipe.materialCostDrachmas,
        marketPriceDrachmas: recipe.masterpieceMarketValue,
        originPolis: currentPolis.name,
      };
    } else {
      outcome = 'ОБЫЧНЫЙ УСПЕХ';
      createdItem = {
        id: `inv-craft-${Date.now()}`,
        name: recipe.baseOutputName,
        category: recipe.outputCategory,
        quantity: 1,
        unit: recipe.outputUnit,
        acquisitionMethod: `Произведено в мастерской (${recipe.specialty}, Ур. ${econ.techneLevel})`,
        purchasePriceDrachmas: recipe.materialCostDrachmas,
        marketPriceDrachmas: recipe.normalMarketValue,
        originPolis: currentPolis.name,
      };
    }

    const nextXp = econ.techneXp + xpEarned;
    const nextLevel = Math.min(5, 1 + Math.floor(nextXp / 100));

    const summary = `Ремесло (${recipe.name}): затрачено сырья на -${recipe.materialCostDrachmas} др. Бросок мастерства: [${outcome}]${createdItem ? ` -> Создано «${createdItem.name}» (оценка ${createdItem.marketPriceDrachmas} др.)` : ' -> Сырьё испорчено при закалке'}`;

    const code = recordOperationWithCode({
      operationType: 'craft',
      locationHashtag: `#Эргастерии_${currentPolis.name}`,
      summary,
      drachmasDelta: -recipe.materialCostDrachmas,
      itemAdded: createdItem,
    });

    setCraftFeedback({
      outcome,
      text: summary,
      code,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas - recipe.materialCostDrachmas,
      inventory: createdItem
        ? [createdItem, ...character.inventory]
        : character.inventory,
      economy: {
        ...econ,
        techneXp: nextXp,
        techneLevel: nextLevel,
        craftsThisCycle: econ.craftsThisCycle + 1,
      },
    });
  };

  // 6. Execute Agora Contract (Эрголабия)
  const handleCompleteContract = (contract: AgoraContract) => {
    if (isFrozenPending || contract.status !== 'open') return;
    sound.playCoinClink();

    const updatedContracts = globalEconomy.agoraContracts.map((c) =>
      c.id === contract.id
        ? {
            ...c,
            status: 'completed' as const,
            completedByCharacterName: character.name,
          }
        : c
    );

    const isStateEmployer = contract.employerType.startsWith('Государство');
    const treasuryDelta = isStateEmployer ? -contract.rewardDrachmas : 0;

    const summary = `Выполнен подряд Агоры «${contract.title}» от заказчика «${contract.employerName}» (+${contract.rewardDrachmas} др., +${contract.techneXpReward} XP ремесла)`;

    const code = recordOperationWithCode({
      operationType: 'contract',
      locationHashtag: contract.locationHashtag,
      summary,
      drachmasDelta: contract.rewardDrachmas,
      treasuryDelta,
      updatedContracts: updatedContracts.map((c) =>
        c.id === contract.id ? { ...c, completedOperationCode: 'PN' } : c
      ),
    });

    const nextXp = econ.techneXp + contract.techneXpReward;
    const nextLevel = Math.min(5, 1 + Math.floor(nextXp / 100));

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas + contract.rewardDrachmas,
      economy: {
        ...econ,
        techneXp: nextXp,
        techneLevel: nextLevel,
      },
    });

    onRecordPolisChronicle?.(
      contract.polisId,
      `Исполнен подряд Агоры: ${contract.title} [${code}]`,
      `${character.name} выполнил заказ «${contract.title}» и получил ${contract.rewardDrachmas} драхм.`
    );
  };

  // 7. Create Player/GM Contract on Agora
  const handlePostNewContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractTitle.trim() || contractReward <= 0) return;
    if (!isGmMode && character.drachmas < contractReward) return;

    sound.playWaxSeal();
    const newContract: AgoraContract = {
      id: `contract-${Date.now()}`,
      title: contractTitle.trim(),
      employerName: isGmMode
        ? 'Казначейство и Магистрат Полиса'
        : `${character.name} (Частный подряд Ойкоса)`,
      employerType: isGmMode
        ? 'Государство (Казначей / Стратег)'
        : 'Знатный Род / Ойкос',
      polisId: character.currentPolisId,
      locationHashtag: contractHashtag.trim() || `#Агора_${currentPolis.name}`,
      description:
        contractDesc.trim() ||
        'Требуется ответственный исполнитель с отчётом по коду в РП-беседе.',
      rewardDrachmas: contractReward,
      techneXpReward: 30,
      requiredTechneLevel: 1,
      status: 'open',
      expiresLabel: 'Свежий подряд Агоры',
    };

    if (!isGmMode) {
      onUpdateCharacter(character.id, {
        drachmas: character.drachmas - contractReward,
      });
    }

    onUpdateGlobalEconomy({
      ...globalEconomy,
      agoraContracts: [newContract, ...globalEconomy.agoraContracts],
    });

    setContractTitle('');
    setContractDesc('');
    setShowNewContractForm(false);
  };

  // 8. Horos Debt Stone (Взять ссуду / Погасить / Военная амнистия Стратега)
  const handleTakeHorosLoan = () => {
    if (isFrozenPending || loanAmount <= 0) return;
    sound.playWaxSeal();
    const interest = 10; // По Ст. 26 не более 12%
    const totalOwed = Math.round(loanAmount * (1 + interest / 100));
    const newDebt: HorosDebtRecord = {
      id: `horos-${Date.now()}`,
      creditorName: loanCreditor,
      principalDrachmas: loanAmount,
      interestRatePercent: interest,
      totalOwedDrachmas: totalOwed,
      pledgedEstateName:
        econ.estates[0]?.name || 'Личная свобода и имущество должника',
      issuedAtLabel: '110 г. до н.э. · Запись на камне Орос',
      isBondageThreat: true,
    };

    const summary = `Установка долгового камня Орос («Ὅρος»): получена ссуда +${loanAmount} др. у «${loanCreditor}» под 10% (к возврату ${totalOwed} др.). Залог: ${newDebt.pledgedEstateName}`;

    recordOperationWithCode({
      operationType: 'horos_debt',
      locationHashtag: `#Трапеза_${currentPolis.name}`,
      summary,
      drachmasDelta: loanAmount,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas + loanAmount,
      economy: {
        ...econ,
        horosDebts: [...(econ.horosDebts || []), newDebt],
      },
    });
  };

  const handleRepayHorosDebt = (debt: HorosDebtRecord) => {
    if (character.drachmas < debt.totalOwedDrachmas) return;
    sound.playCoinClink();

    const summary = `Снятие долгового камня Орос («Ὅρος»): полностью выплачен долг ${debt.totalOwedDrachmas} др. кредитору «${debt.creditorName}»`;

    recordOperationWithCode({
      operationType: 'horos_debt',
      locationHashtag: `#Трапеза_${currentPolis.name}`,
      summary,
      drachmasDelta: -debt.totalOwedDrachmas,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas - debt.totalOwedDrachmas,
      economy: {
        ...econ,
        horosDebts: econ.horosDebts.filter((d) => d.id !== debt.id),
      },
    });
  };

  const handleMilitaryDebtAmnesty = (debt: HorosDebtRecord) => {
    sound.playWaxSeal();
    const reducedOwed = Math.max(0, Math.round(debt.totalOwedDrachmas * 0.4));
    const summary = `Военная амнистия Стратега (Сейсахфия за службу в ополчении): долг по камню Орос перед «${debt.creditorName}» списан на 60% (остаток: ${reducedOwed} др.)`;

    recordOperationWithCode({
      operationType: 'horos_debt',
      locationHashtag: `#Военный_Лагерь_${currentPolis.name}`,
      summary,
      drachmasDelta: 0,
    });

    onUpdateCharacter(character.id, {
      economy: {
        ...econ,
        horosDebts:
          reducedOwed === 0
            ? econ.horosDebts.filter((d) => d.id !== debt.id)
            : econ.horosDebts.map((d) =>
                d.id === debt.id ? { ...d, totalOwedDrachmas: reducedOwed } : d
              ),
      },
    });
  };

  // 9. Armenian Trade Syndicate Import
  const handleBuySyndicateGood = (goodId: string) => {
    if (isFrozenPending) return;
    const good = ARMENIAN_SYNDICATE_GOODS.find((g) => g.id === goodId);
    if (!good) return;

    const unitCost = isArmenianOrSyndicate
      ? good.syndicateWholesalePrice
      : good.regularImportPrice;

    if (character.drachmas < unitCost) return;
    sound.playCoinClink();

    const newItem: CharacterInventoryItem = {
      id: `inv-arm-${Date.now()}`,
      name: good.name,
      category: good.category,
      quantity: 1,
      unit: good.unit,
      acquisitionMethod: isArmenianOrSyndicate
        ? `Закуплено по закрытой квоте Армянского Торгового Синдиката (-40%, ${unitCost} др.)`
        : `Приобретено у караванщиков Армянского Синдиката за ${unitCost} др.`,
      purchasePriceDrachmas: unitCost,
      marketPriceDrachmas: good.resellMarketValue,
      originPolis: 'Караван Великой Армении',
    };

    const customsFee = Math.round(unitCost * 0.1);
    const summary = `Сделка с Армянским Синдикатом: закуплено «${good.name}» за ${unitCost} др. (${isArmenianOrSyndicate ? 'Оптовая квота Синдиката -40%' : 'Розничный тариф'}, оценка у купцов Понта: ${good.resellMarketValue} др.)`;

    recordOperationWithCode({
      operationType: 'syndicate',
      locationHashtag: `#Караван_Сарай_${currentPolis.name}`,
      summary,
      drachmasDelta: -unitCost,
      itemAdded: newItem,
      treasuryDelta: customsFee,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas - unitCost,
      inventory: [newItem, ...character.inventory],
    });
  };

  // 10. Claim State Treasury Payout (Теорикон / Диобелия — strictly from State Treasury!)
  const handleClaimCitizenDiobelia = () => {
    if (isFrozenPending) return;
    if (econ.residencyStatus !== 'Местный гражданин (Полит)') return;
    const payout =
      globalEconomy.politicalPendulum === 'demos'
        ? 85
        : globalEconomy.politicalPendulum === 'balanced'
          ? 40
          : 0;
    if (payout <= 0 || globalEconomy.treasuryDrachmas < payout) return;

    sound.playCoinClink();
    const summary = `Получена гражданская выплата из Государственной Казны (Диобелия / Теорикон) при строе «${
      globalEconomy.politicalPendulum === 'demos'
        ? 'Власть Демоса'
        : 'Смешанный строй'
    }»: +${payout} др.`;

    recordOperationWithCode({
      operationType: 'treasury_payout',
      locationHashtag: `#Экклесия_${currentPolis.name}`,
      summary,
      drachmasDelta: payout,
      treasuryDelta: -payout,
    });

    onUpdateCharacter(character.id, {
      drachmas: character.drachmas + payout,
    });
  };

  // 11. GM / VKK Rollback of an operation code (Аннулировать операцию без РП-поста)
  const handleRevertOperation = (entry: EconomyOperationLogEntry) => {
    if (entry.status === 'reverted') return;
    sound.playWaxSeal();

    // If this operation belongs to the currently active character, reverse drachmas & item immediately
    if (entry.characterId === character.id) {
      const reversedDrachmas = Math.max(
        0,
        character.drachmas - entry.drachmasDelta
      );
      const reversedInventory = entry.itemAdded
        ? character.inventory.filter((i) => i.id !== entry.itemAdded?.id)
        : character.inventory;

      onUpdateCharacter(character.id, {
        drachmas: reversedDrachmas,
        inventory: reversedInventory,
      });
    }

    onUpdateGlobalEconomy({
      ...globalEconomy,
      operationLogs: globalEconomy.operationLogs.map((op) =>
        op.id === entry.id
          ? {
              ...op,
              status: 'reverted',
              revertedBy: isGmMode ? 'ГМ / Цензор ВКК' : 'Отменено',
            }
          : op
      ),
    });
  };

  const handleVerifyOperation = (entryId: string) => {
    sound.playStoneTap();
    onUpdateGlobalEconomy({
      ...globalEconomy,
      operationLogs: globalEconomy.operationLogs.map((op) =>
        op.id === entryId ? { ...op, status: 'verified' } : op
      ),
    });
  };

  const filteredLogs = (globalEconomy.operationLogs || []).filter((log) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      log.code.toLowerCase().includes(q) ||
      log.characterName.toLowerCase().includes(q) ||
      log.summary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="stele-panel p-5 sm:p-8 space-y-6 border-2 border-[#D4AF37]">
      <LaurelHeaderDivider label="Экономический Кодекс Понта 2.0 · Ойкос, Навык и Кабала" />

      {/* Top Summary Strip: Residency, Oikos Slaves, Full Capital & Eisphora Tax */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#263140] pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-epigraphic">
            <span
              className={`px-2.5 py-0.5 rounded border font-bold ${
                econ.residencyStatus === 'Местный гражданин (Полит)'
                  ? 'bg-[#2E5A44]/40 border-[#4E8765] text-[#8EBDA2]'
                  : 'bg-[#E5C158]/20 border-[#D4AF37] text-[#E5C158]'
              }`}
            >
              {econ.residencyStatus}
            </span>
            {econ.originStoryTag && (
              <span className="text-[#C2B280]">· {econ.originStoryTag}</span>
            )}
            {econ.horosDebts?.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#8B2635]/40 border border-[#C0392B] text-[#F1A9B2] font-bold">
                Долговой камень Орос ({calc.totalDebt} др.)
              </span>
            )}
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F3E5AB]">
            Хозяйство (Ойкос), Ремесло «Технэ» и Клейма Операций ВК
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playStoneTap();
              setShowEconomyGuide(!showEconomyGuide);
            }}
            className={`min-h-[44px] px-4 py-2.5 rounded text-xs font-epigraphic flex items-center justify-center gap-2 cursor-pointer border transition-colors ${
              showEconomyGuide
                ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
                : 'btn-basalt-stele'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#E5C158] shrink-0" />
            <span>
              {showEconomyGuide
                ? 'Скрыть Обучение Экономике'
                : '📖 Обучение Экономике (Простыми словами)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playCoinClink();
              setShowWealthGenerator(!showWealthGenerator);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {showWealthGenerator
                ? 'Скрыть Генератор Класса и Товара'
                : '⚙ Генератор Класса, Товара на Сумму и Ремесла'}
            </span>
          </button>
        </div>
      </div>

      {/* Collapsible Simple Economy Tutorial Guide */}
      {showEconomyGuide && <SimpleEconomyGuideBlock />}

      {/* Collapsible Starter Wealth & Origin Generator inside Profile */}
      {showWealthGenerator && (
        <StarterWealthGeneratorBox
          polisId={character.currentPolisId}
          polisName={currentPolis.name}
          nationality={character.nationality}
          initialResidency={econ.residencyStatus}
          initialWealthTier={econ.wealthTierId}
          initialSlaves={econ.slavesCount}
          initialDrachmas={character.drachmas}
          onApplyGeneratedPackage={(pkg) => {
            const code = recordOperationWithCode({
              operationType: 'rent',
              locationHashtag: `#Реестр_${currentPolis.name}`,
              summary: `Установлен имущественный достаток анкеты: ${pkg.economy.residencyStatus} (${pkg.economy.originStoryTag}), кошель ${pkg.drachmas} др., рабов: ${pkg.economy.slavesCount}, владений Ойкоса: ${pkg.economy.estates.length}`,
              drachmasDelta: pkg.drachmas - character.drachmas,
            });
            onUpdateCharacter(character.id, {
              drachmas: pkg.drachmas,
              status: pkg.status,
              position: pkg.position,
              economy: pkg.economy,
              inventory: pkg.inventory,
            });
            setShowWealthGenerator(false);
            void code;
          }}
        />
      )}

      {/* Instant 8-Digit VK RP Operation Stamp Banner (PN-XXXXXXXX) */}
      {latestStamp && (
        <div className="p-4 rounded bg-[#1B232E] border-2 border-[#E5C158] votive-glow flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-epigraphic uppercase text-[#E5C158] font-bold">
              <ScrollText className="w-4 h-4 shrink-0" />
              <span>
                Клеймо Операции для Беседы ВК · Код: {latestStamp.code}
              </span>
            </div>
            <pre className="text-xs sm:text-sm font-mono text-[#F3E5AB] whitespace-pre-wrap bg-[#0B0F14] p-2.5 rounded border border-[#D4AF37]/50">
              {latestStamp.vkText}
            </pre>
            <p className="text-[11px] text-[#C2B280]">
              Скопируйте эту шапку в 1 клик и вставьте в начало вашего РП-поста в беседе ВК. Код автоматически сохранён в Журнале ВКК/ГМ.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(latestStamp.vkText);
              sound.playStoneTap();
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2500);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {copiedCode ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Скопировано для поста ВК!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Скопировать шапку и код {latestStamp.code}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 4 Sub-Tabs of the Economic Codex */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setCodexTab('oikos');
          }}
          className={`min-h-[44px] px-3.5 py-2.5 rounded text-xs font-epigraphic flex items-center justify-center gap-2 border cursor-pointer transition-all ${
            codexTab === 'oikos'
              ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
              : 'bg-[#121820] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>1. Ойкос, Рабы ({econ.slavesCount}/15) и Эйсфора</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setCodexTab('techne');
          }}
          className={`min-h-[44px] px-3.5 py-2.5 rounded text-xs font-epigraphic flex items-center justify-center gap-2 border cursor-pointer transition-all ${
            codexTab === 'techne'
              ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
              : 'bg-[#121820] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
          }`}
        >
          <Hammer className="w-4 h-4 shrink-0" />
          <span>2. Ремесло Технэ (Ур. {econ.techneLevel}/5)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setCodexTab('agora_syndicate');
          }}
          className={`min-h-[44px] px-3.5 py-2.5 rounded text-xs font-epigraphic flex items-center justify-center gap-2 border cursor-pointer transition-all ${
            codexTab === 'agora_syndicate'
              ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
              : 'bg-[#121820] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>3. Агора, Кабала (Орос) и Синдикат</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playStoneTap();
            setCodexTab('audit_treasury');
          }}
          className={`min-h-[44px] px-3.5 py-2.5 rounded text-xs font-epigraphic flex items-center justify-center gap-2 border cursor-pointer transition-all ${
            codexTab === 'audit_treasury'
              ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
              : 'bg-[#121820] text-[#C2B280] border-[#263140] hover:text-[#F3E5AB]'
          }`}
        >
          <Landmark className="w-4 h-4 shrink-0" />
          <span>
            4. Казна ({globalEconomy.treasuryDrachmas} др.) и Коды PN
          </span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: ОЙКОС, РАБЫ И ПРОГРЕССИВНЫЙ НАЛОГ (ЭЙСФОРА)
      ===================================================================== */}
      {codexTab === 'oikos' && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="wax-recess p-4 space-y-1">
              <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Полный Капитал (Кошель + Ойкос + Рабы + Товары)
              </span>
              <span className="font-epigraphic text-lg font-bold text-[#F3E5AB] tabular-nums block">
                {calc.fullGrossCapital.toLocaleString('ru-RU')} драхм
              </span>
              <span className="text-[11px] text-[#8EBDA2] block">
                Защита от укрытия наличных при расчёте налога
              </span>
            </div>

            <div className="wax-recess p-4 space-y-1">
              <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Штат Рабов (Лимит Ст. 25: макс. 15)
              </span>
              <span className="font-epigraphic text-lg font-bold text-[#E5C158] tabular-nums block">
                {econ.slavesCount} / 15 душ
              </span>
              <span className="text-[11px] text-[#C2B280] block">
                Содержание: -{calc.slaveUpkeep} др.
                {econ.hasOverseer ? ' (Надсмотрщик: -30 др.)' : ''}
              </span>
            </div>

            <div className="wax-recess p-4 space-y-1">
              <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Налог на роскошь (Эйсфора) и Литургии
              </span>
              <span className="font-epigraphic text-lg font-bold text-[#E5C158] tabular-nums block">
                {calc.eisphoraRatePercent}% (-{calc.eisphoraTaxAmount} др. в Казну)
              </span>
              <span className="text-[11px] text-[#C2B280] block">
                {calc.liturgyStatus}
              </span>
            </div>

            <div className="wax-recess p-4 space-y-1">
              <span className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                Чистая Рента Ойкоса за Цикл
              </span>
              <span
                className={`font-epigraphic text-lg font-bold tabular-nums block ${
                  calc.netRentIncome >= 0 ? 'text-[#8EBDA2]' : 'text-[#F1A9B2]'
                }`}
              >
                {calc.netRentIncome >= 0
                  ? `+${calc.netRentIncome}`
                  : calc.netRentIncome}{' '}
                драхм
              </span>
              <span className="text-[11px] text-[#C2B280] block">
                Валовой доход: +{calc.grossEstateRent} др. · Расходы: -
                {calc.totalUpkeepAndTaxes} др.
              </span>
            </div>
          </div>

          {/* Primary Action Bar: Collect Rent OR Work With Own Hands (Autourgos) */}
          <div className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#D4AF37]/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                Доход Хозяйства (Рента рабов) или Личный Труд Своими Руками (Аутургос)
              </h4>
              <p className="text-xs text-[#C2B280] leading-relaxed">
                {econ.slavesCount > 0 && econ.estates.length > 0
                  ? `В ваших владениях трудятся рабы (${econ.slavesCount} чел.). Вы можете собрать ренту с автоматическим отчислением Эйсфоры (${calc.eisphoraTaxAmount} др.) в Государственную Казну и получить код операции PN-XXXXXXXX.`
                  : 'У вас сейчас нет рабов на участках II–III уровня (рента = 0 др.). Трудитесь своими руками (быть аутургосом/фетом) или купите рабов в Квартале РАБЫ!'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {econ.estates.length > 0 && econ.slavesCount > 0 && (
                <button
                  type="button"
                  disabled={isFrozenPending}
                  onClick={handleCollectOikosRent}
                  className="min-h-[44px] px-4 py-2.5 rounded btn-golden-stater text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>
                    Собрать Ренту Ойкоса (
                    {calc.netRentIncome >= 0
                      ? `+${calc.netRentIncome}`
                      : calc.netRentIncome}{' '}
                    др.)
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isFrozenPending}
                onClick={handleManualLabor}
                className="min-h-[44px] px-4 py-2.5 rounded btn-basalt-stele text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Hammer className="w-4 h-4 text-[#E5C158] shrink-0" />
                <span>
                  Трудиться своими руками (+
                  {(econ.estates.some((e) => e.tier === 1) ? 65 : 45) +
                    econ.techneLevel * 8 -
                    (econ.residencyStatus ===
                    'Приезжий / Неместный (Метек / Ксен)'
                      ? 6
                      : 0)}{' '}
                  др.)
                </span>
              </button>
            </div>
          </div>

          {/* Split: 1) Owned Oikos Estates & Catalog (Max 2) | 2) Sinope Slave Market (Max 15) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Oikos Estates */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-4">
              <div className="flex items-center justify-between border-b border-[#263140] pb-3">
                <div>
                  <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                    Недвижимость, Клеросы и Корабли (Ст. 25 Конституции: макс. 2 владения)
                  </span>
                  <h4 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                    Ваши Владения Ойкоса ({econ.estates.length} / 2)
                  </h4>
                </div>
              </div>

              {econ.estates.length === 0 ? (
                <div className="wax-recess p-4 text-xs text-[#C2B280]">
                  У персонажа пока нет собственных участков земли, мастерских или кораблей. Вы можете трудиться своими руками, выполнять заказы на Агоре или приобрести владение ниже!
                </div>
              ) : (
                <div className="space-y-3">
                  {econ.estates.map((est) => (
                    <div
                      key={est.id}
                      className="p-3.5 rounded bg-[#121820] border border-[#D4AF37]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-epigraphic text-[#E5C158]">
                          <span>Уровень {est.tier}</span>
                          <span>·</span>
                          <span>{est.category}</span>
                          <span>·</span>
                          <span>Вместимость: до {est.maxSlaves} рабов</span>
                        </div>
                        <h5 className="font-display text-base font-bold text-[#F3E5AB]">
                          {est.name}
                        </h5>
                        <p className="text-xs text-[#8EBDA2]">
                          Доход за 1 раба: +{est.incomePerSlave} др. (Макс. вал: +
                          {est.maxSlaves * est.incomePerSlave} др.) · Оценка
                          капитала: {est.purchaseValueDrachmas} др.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSellEstate(est.id)}
                        className="px-3 py-1.5 rounded bg-[#2A151B] hover:bg-[#4A1C26] border border-[#8B2635] text-xs text-[#F1A9B2] shrink-0 cursor-pointer"
                      >
                        Продать (+{Math.round(est.purchaseValueDrachmas * 0.8)} др.)
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {econ.estates.length < 2 && (
                <div className="pt-3 border-t border-[#263140] space-y-2.5">
                  <span className="block font-epigraphic text-xs uppercase text-[#C2B280]">
                    Доступно для приобретения в полисе {currentPolis.name} (ещё{' '}
                    {2 - econ.estates.length} слот):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {OIKOS_ESTATE_CATALOG.map((tpl) => {
                      const needsProxenia =
                        econ.residencyStatus !== 'Местный гражданин (Полит)' &&
                        !tpl.allowsNonCitizenWithoutProxenia;
                      const totalPrice =
                        tpl.purchaseValueDrachmas + (needsProxenia ? 120 : 0);
                      const canAfford =
                        character.drachmas >= totalPrice && !isFrozenPending;

                      return (
                        <div
                          key={tpl.id}
                          className="p-3 rounded bg-[#121820] border border-[#263140] flex flex-col justify-between gap-2"
                        >
                          <div>
                            <span className="text-[10px] font-epigraphic text-[#E5C158] uppercase block">
                              Ур. {tpl.tier} · до {tpl.maxSlaves} раб. · +
                              {tpl.maxSlaves * tpl.incomePerSlave} др./цикл
                            </span>
                            <div className="font-display text-sm font-bold text-[#F3E5AB] mt-0.5">
                              {tpl.name}
                            </div>
                            <p className="text-[11px] text-[#C2B280] mt-1">
                              {tpl.description}
                            </p>
                            {needsProxenia && (
                              <span className="text-[10px] text-[#E5C158] block mt-1">
                                Для неместного метека: +120 др. пошлина проксении за землю
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleBuyEstate(tpl.id)}
                            className="w-full min-h-[36px] px-3 py-1.5 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                          >
                            Купить за {totalPrice} др.
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 cols: Slave Market of Sinope (Квартал РАБЫ) */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-4">
              <div className="border-b border-[#263140] pb-3">
                <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                  Синопский Невольничий Рынок · Квартал «РАБЫ»
                </span>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                  Покупка, Продажа и Надзор за Рабами
                </h4>
                <p className="text-xs text-[#C2B280] mt-1">
                  Без рабов участки II–III уровня не приносят ренты. Антимонопольный закон (Ст. 25) запрещает владеть более чем 15 рабами в одних руках.
                </p>
              </div>

              <div className="wax-recess p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#C2B280]">Конъюнктура рынка ГМа:</span>
                  <span className="font-epigraphic font-bold text-[#E5C158]">
                    {globalEconomy.slaveMarketRegime === 'peace_deficit'
                      ? 'Мирное время (Дефицит рабов)'
                      : globalEconomy.slaveMarketRegime === 'war_flood'
                        ? 'Военный поход Стратега (Поток пленных!)'
                        : 'Обычная навигация (Норма)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#C2B280]">Цена за 1 раба сейчас:</span>
                  <span className="font-epigraphic text-sm font-bold text-[#F3E5AB] tabular-nums">
                    {slaveUnitPrice} драхм
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#C2B280]">Доступно на рынке Синопы:</span>
                  <span className="font-bold text-[#8EBDA2] tabular-nums">
                    {globalEconomy.slaveMarketPool} душ
                  </span>
                </div>
                {calc.slaveRevoltRiskPercent > 0 && (
                  <div className="p-2 rounded bg-[#8B2635]/30 border border-[#C0392B] text-[#F1A9B2] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Риск побега рабов: {calc.slaveRevoltRiskPercent}% (свыше 5 рабов без надсмотрщика!)
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={
                    isFrozenPending ||
                    econ.slavesCount >= 15 ||
                    globalEconomy.slaveMarketPool < 1 ||
                    character.drachmas < slaveUnitPrice
                  }
                  onClick={() => handleBuySlave(1)}
                  className="min-h-[42px] px-3 py-2 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                >
                  + Купить 1 раба ({slaveUnitPrice} др.)
                </button>

                <button
                  type="button"
                  disabled={
                    isFrozenPending ||
                    econ.slavesCount + 3 > 15 ||
                    globalEconomy.slaveMarketPool < 3 ||
                    character.drachmas < slaveUnitPrice * 3
                  }
                  onClick={() => handleBuySlave(3)}
                  className="min-h-[42px] px-3 py-2 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                >
                  + Купить 3 рабов ({slaveUnitPrice * 3} др.)
                </button>

                <button
                  type="button"
                  disabled={isFrozenPending || econ.slavesCount < 1}
                  onClick={() => handleSellSlave(1)}
                  className="min-h-[42px] px-3 py-2 rounded btn-basalt-stele text-xs cursor-pointer disabled:opacity-40"
                >
                  Продать 1 раба (+{Math.round(slaveUnitPrice * 0.85)} др.)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playStoneTap();
                    onUpdateCharacter(character.id, {
                      economy: {
                        ...econ,
                        hasOverseer: !econ.hasOverseer,
                      },
                    });
                  }}
                  className={`min-h-[42px] px-3 py-2 rounded text-xs font-epigraphic border cursor-pointer ${
                    econ.hasOverseer
                      ? 'bg-[#2E5A44]/40 border-[#4E8765] text-[#8EBDA2]'
                      : 'bg-[#121820] border-[#263140] text-[#C2B280]'
                  }`}
                >
                  {econ.hasOverseer
                    ? '✓ Надсмотрщик нанят (-30 др.)'
                    : '+ Нанять Надсмотрщика'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: РЕМЕСЛО (ТЕХНЭ 1–5) И ПРОИЗВОДСТВЕННЫЕ ЦЕПОЧКИ
      ===================================================================== */}
      {codexTab === 'techne' && (
        <div className="space-y-5">
          <div className="p-4 rounded bg-[#1B232E] border border-[#D4AF37]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                Ремесленная Специализация · Анти-эксплойт лимит: {3 - econ.craftsThisCycle}/3 ковок до отдыха
              </span>
              <h4 className="font-display text-xl font-bold text-[#F3E5AB]">
                {econ.techneSpecialty} · Мастерство {econ.techneLevel} / 5 (Опыт:{' '}
                {econ.techneXp} XP)
              </h4>
              <p className="text-xs text-[#C2B280]">
                Чем выше уровень «Технэ», тем ниже шанс брака и выше вероятность создать <strong>★ ШЕДЕВР МАСТЕРА</strong> (двойная рыночная стоимость у купцов Понта!).
              </p>
            </div>

            <div className="wax-recess px-3 py-2 shrink-0">
              <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                Сменить профиль ремесла:
              </label>
              <select
                value={econ.techneSpecialty}
                onChange={(e) => {
                  sound.playStoneTap();
                  onUpdateCharacter(character.id, {
                    economy: {
                      ...econ,
                      techneSpecialty: e.target.value as TechneSpecialty,
                    },
                  });
                }}
                className="bg-[#0B0F14] text-xs font-bold text-[#E5C158] focus:outline-none cursor-pointer"
              >
                <option value="Кузнечное дело и броня (Халибия)">
                  Кузнечное дело и броня (Халибия)
                </option>
                <option value="Корабельное плотничество (Синопа)">
                  Корабельное плотничество (Синопа)
                </option>
                <option value="Виноделие, масло и амфоры">
                  Виноделие, масло и амфоры
                </option>
                <option value="Ткачество, пурпур и ювелирка">
                  Ткачество, пурпур и ювелирка
                </option>
                <option value="Врачевание и териаки">
                  Врачевание и териаки
                </option>
              </select>
            </div>
          </div>

          {craftFeedback && (
            <div
              className={`p-4 rounded border-2 ${
                craftFeedback.outcome === 'ШЕДЕВР МАСТЕРА!'
                  ? 'bg-[#263140] border-[#E5C158] votive-glow'
                  : craftFeedback.outcome === 'БРАК'
                    ? 'bg-[#2A151B] border-[#C0392B]'
                    : 'bg-[#1B232E] border-[#4E8765]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-epigraphic text-xs uppercase font-bold text-[#E5C158]">
                  Исход производства: {craftFeedback.outcome} · Код:{' '}
                  {craftFeedback.code}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#F3E5AB] mt-1">
                {craftFeedback.text}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TECHNE_RECIPES.map((rec) => {
              const unlocked = econ.techneLevel >= rec.minLevel;
              const canCraft =
                unlocked &&
                econ.craftsThisCycle < 3 &&
                character.drachmas >= rec.materialCostDrachmas &&
                !isFrozenPending;

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded border space-y-3 flex flex-col justify-between ${
                    unlocked
                      ? 'bg-[#1B232E] border-[#263140]'
                      : 'bg-[#121820]/70 border-[#263140]/50 opacity-75'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-epigraphic">
                      <span className="text-[#E5C158]">{rec.specialty}</span>
                      <span
                        className={`px-2 py-0.5 rounded ${
                          unlocked
                            ? 'bg-[#2E5A44]/40 text-[#8EBDA2]'
                            : 'bg-[#8B2635]/40 text-[#F1A9B2]'
                        }`}
                      >
                        Требуется Технэ Ур. {rec.minLevel}
                      </span>
                    </div>
                    <h5 className="font-display text-base sm:text-lg font-bold text-[#F3E5AB]">
                      {rec.name}
                    </h5>
                    <p className="text-xs text-[#C2B280]">
                      <strong>Цепочка сырья:</strong> {rec.inputDescription}
                    </p>
                    <div className="wax-recess p-2.5 grid grid-cols-3 gap-2 text-xs tabular-nums">
                      <div>
                        <span className="block text-[10px] text-[#C2B280]">
                          Затраты сырья
                        </span>
                        <span className="font-bold text-[#F1A9B2]">
                          -{rec.materialCostDrachmas} др.
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#C2B280]">
                          Обычный сбыт
                        </span>
                        <span className="font-bold text-[#8EBDA2]">
                          {rec.normalMarketValue} др.
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#E5C158]">
                          ★ Шедевр
                        </span>
                        <span className="font-bold text-[#E5C158]">
                          {rec.masterpieceMarketValue} др.
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canCraft}
                    onClick={() => handleCraftRecipe(rec.id)}
                    className="w-full min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Hammer className="w-4 h-4 shrink-0" />
                    <span>
                      {!unlocked
                        ? `Нужен ${rec.minLevel} ур. навыка Технэ`
                        : econ.craftsThisCycle >= 3
                          ? 'Лимит цикла (3/3) — соберите ренту или отдохните'
                          : `Произвести за ${rec.materialCostDrachmas} др. (+${rec.xpGain} XP)`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: АГОРА ЗАКАЗОВ (ЭРГОЛАБИЯ), КАБАЛА (ОРОС) И АРМЯНСКИЙ СИНДИКАТ
      ===================================================================== */}
      {codexTab === 'agora_syndicate' && (
        <div className="space-y-6">
          {/* 1. Доска подрядов Агоры (Эрголабия) */}
          <div className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-3">
              <div>
                <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                  Эрголабия · Подряды Казначея, Стратега и Знатных Домов
                </span>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                  Доска Заказов и Найма на Агоре
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowNewContractForm(!showNewContractForm)}
                className="min-h-[38px] px-3.5 py-1.5 rounded btn-golden-stater text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Выставить Подряд на Агору</span>
              </button>
            </div>

            {showNewContractForm && (
              <form
                onSubmit={handlePostNewContract}
                className="p-3.5 rounded bg-[#121820] border border-[#D4AF37] space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                      Название заказа *
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        required
                        value={contractTitle}
                        onChange={(e) => setContractTitle(e.target.value)}
                        placeholder="Напр.: Охрана каравана в Опиу"
                        className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                      Вознаграждение (Драхм)
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="number"
                        min={20}
                        max={2000}
                        value={contractReward}
                        onChange={(e) =>
                          setContractReward(Number(e.target.value) || 50)
                        }
                        className="w-full bg-transparent text-xs font-bold text-[#E5C158] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                      Хэштег локации для ВК
                    </label>
                    <div className="wax-recess px-2.5 py-1.5">
                      <input
                        type="text"
                        value={contractHashtag}
                        onChange={(e) => setContractHashtag(e.target.value)}
                        className="w-full bg-transparent text-xs text-[#8EBDA2] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="wax-recess p-2">
                  <input
                    type="text"
                    value={contractDesc}
                    onChange={(e) => setContractDesc(e.target.value)}
                    placeholder="Описание задачи для исполнителя..."
                    className="w-full bg-transparent text-xs text-[#E2DAC2] focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded btn-golden-stater text-xs cursor-pointer"
                  >
                    Разместить заказ ({isGmMode ? 'От Государства' : `-${contractReward} др.`})
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(globalEconomy.agoraContracts || []).map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded border flex flex-col justify-between gap-3 ${
                    c.status === 'open'
                      ? 'bg-[#121820] border-[#D4AF37]/60'
                      : 'bg-[#121820]/50 border-[#263140] opacity-65'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-epigraphic text-[#E5C158]">
                      <span>{c.employerType}</span>
                      <span>{c.locationHashtag}</span>
                    </div>
                    <h5 className="font-display text-sm sm:text-base font-bold text-[#F3E5AB]">
                      {c.title}
                    </h5>
                    <p className="text-xs text-[#C2B280]">{c.description}</p>
                    <p className="text-[11px] text-[#8EBDA2] pt-1">
                      Заказчик: <strong>{c.employerName}</strong> · Награда:{' '}
                      <strong>+{c.rewardDrachmas} др.</strong> (+{c.techneXpReward}{' '}
                      XP)
                    </p>
                  </div>

                  {c.status === 'open' ? (
                    <button
                      type="button"
                      disabled={isFrozenPending}
                      onClick={() => handleCompleteContract(c)}
                      className="w-full min-h-[38px] px-3 py-1.5 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                    >
                      Выполнить подряд (+{c.rewardDrachmas} др.)
                    </button>
                  ) : (
                    <div className="text-[11px] font-epigraphic text-[#8EBDA2]">
                      ✓ Исполнено: {c.completedByCharacterName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Split: Debt Stones (Орос) & Armenian Trade Syndicate */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 6 cols: Horos Debt Stones & Military Amnesty */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-4">
              <div className="border-b border-[#263140] pb-3">
                <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                  Долговые Камни «Ὅρος» (Орос) · Ст. 26 Конституции (макс. 12%)
                </span>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                  Займы Трапезы, Залог Ойкоса и Военная Амнистия
                </h4>
                <p className="text-xs text-[#C2B280] mt-1">
                  Нужны срочные драхмы на корабль или рабов? Возьмите ссуду под залог участка. А если долг грозит кабалой — вступите в поход Стратега для списания 60% долга (защита от «суицида анкеты»!).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="wax-recess px-3 py-2 flex-1">
                  <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280]">
                    Сумма ссуды (Драхм)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={1500}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value) || 100)}
                    className="w-full bg-transparent text-xs font-bold text-[#F3E5AB] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={isFrozenPending}
                  onClick={handleTakeHorosLoan}
                  className="min-h-[42px] px-4 py-2 rounded btn-golden-stater text-xs cursor-pointer shrink-0 disabled:opacity-40"
                >
                  Взять ссуду (+{loanAmount} др. под 10%)
                </button>
              </div>

              {(econ.horosDebts || []).length === 0 ? (
                <div className="wax-recess p-3.5 text-xs text-[#8EBDA2]">
                  На вашей земле и мастерских нет долговых камней «Орос». Ваш Ойкос свободен от залогов!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {econ.horosDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className="p-3.5 rounded bg-[#2A151B]/70 border border-[#C0392B] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-epigraphic text-[#F1A9B2] font-bold">
                          КАМЕНЬ ОРОС · Кредитор: {debt.creditorName}
                        </span>
                        <span className="font-bold text-[#E5C158] tabular-nums">
                          Долг: {debt.totalOwedDrachmas} др.
                        </span>
                      </div>
                      <p className="text-xs text-[#E2DAC2]">
                        Заложено: <strong>{debt.pledgedEstateName}</strong>
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={character.drachmas < debt.totalOwedDrachmas}
                          onClick={() => handleRepayHorosDebt(debt)}
                          className="px-3 py-1.5 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                        >
                          Погасить и сбросить камень ({debt.totalOwedDrachmas} др.)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMilitaryDebtAmnesty(debt)}
                          className="px-3 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Swords className="w-3.5 h-3.5 text-[#E5C158]" />
                          <span>Поход Стратега (-60% долга)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right 6 cols: Armenian Trade Syndicate */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded bg-[#1B232E] border border-[#D4AF37]/70 space-y-4">
              <div className="border-b border-[#263140] pb-3 flex items-start justify-between gap-2">
                <div>
                  <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                    Восточная Монополия и Трапеза · Армянский Торговый Синдикат
                  </span>
                  <h4 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                    Караваны Великой Армении (Шёлк, Кони, Самоцветы)
                  </h4>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-epigraphic font-bold shrink-0 ${
                    isArmenianOrSyndicate
                      ? 'bg-[#2E5A44]/50 border border-[#4E8765] text-[#8EBDA2]'
                      : 'bg-[#121820] border border-[#263140] text-[#C2B280]'
                  }`}
                >
                  {isArmenianOrSyndicate
                    ? 'Квота Синдиката: Скидка -40%'
                    : 'Обычный тариф (Вступить: 180 др.)'}
                </span>
              </div>

              {!isArmenianOrSyndicate && (
                <div className="flex items-center justify-between p-2.5 rounded bg-[#121820] border border-[#263140] text-xs">
                  <span className="text-[#C2B280]">
                    Персонажи из Армении имеют оптовую квоту с рождения. Иноземные купцы могут приобрести пай Синдиката:
                  </span>
                  <button
                    type="button"
                    disabled={character.drachmas < 180 || isFrozenPending}
                    onClick={() => {
                      sound.playWaxSeal();
                      recordOperationWithCode({
                        operationType: 'syndicate',
                        locationHashtag: '#Трапеза_Синдиката',
                        summary:
                          'Приобретён купеческий пай Армянского Торгового Синдиката (-180 др., открыт доступ к оптовой квоте -40%)',
                        drachmasDelta: -180,
                        treasuryDelta: 40,
                      });
                      onUpdateCharacter(character.id, {
                        drachmas: character.drachmas - 180,
                        economy: {
                          ...econ,
                          isArmenianSyndicateMember: true,
                        },
                      });
                    }}
                    className="px-3 py-1.5 rounded btn-basalt-stele text-xs text-[#E5C158] shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    Купить пай (180 др.)
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {ARMENIAN_SYNDICATE_GOODS.map((good) => {
                  const myPrice = isArmenianOrSyndicate
                    ? good.syndicateWholesalePrice
                    : good.regularImportPrice;
                  const canBuy =
                    character.drachmas >= myPrice && !isFrozenPending;

                  return (
                    <div
                      key={good.id}
                      className="p-3 rounded bg-[#121820] border border-[#263140] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="font-display text-sm font-bold text-[#F3E5AB]">
                          {good.name}
                        </div>
                        <p className="text-[11px] text-[#C2B280]">
                          {good.description}
                        </p>
                        <div className="text-[11px] font-epigraphic text-[#8EBDA2]">
                          Ваша цена закупки: <strong>{myPrice} др.</strong> ·
                          Продажа купцам Понта:{' '}
                          <strong>{good.resellMarketValue} др.</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => handleBuySyndicateGood(good.id)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded btn-golden-stater text-xs shrink-0 cursor-pointer disabled:opacity-40"
                      >
                        Закупить ({myPrice} др.)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: ПОЛИТЭКОНОМИЯ КАЗНЫ И ЖУРНАЛ КОДОВ PN-XXXXXXXX (АУДИТ ВКК / ГМ)
      ===================================================================== */}
      {codexTab === 'audit_treasury' && (
        <div className="space-y-6">
          {/* State Treasury & Political Pendulum Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-6 p-4 sm:p-5 rounded bg-[#1B232E] border border-[#D4AF37]/70 flex flex-col justify-between space-y-4">
              <div>
                <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                  Замкнутый Контур Макроэкономики · Ст. 15–17 Конституции (Казначей)
                </span>
                <h4 className="font-display text-xl font-bold text-[#F3E5AB] mt-0.5">
                  Государственная Казна Понта:{' '}
                  <span className="text-[#E5C158] tabular-nums">
                    {globalEconomy.treasuryDrachmas.toLocaleString('ru-RU')} драхм
                  </span>
                </h4>
                <p className="text-xs text-[#C2B280] mt-1 leading-relaxed">
                  Казна пополняется реальными налогами игроков (Эйсфора 10%/25%, метойкион неместных, пошлины невольничьего рынка) и расходуется на госзаказы и гражданские выплаты (Диобелия / Теорикон), исключая инфляцию из воздуха.
                </p>
              </div>

              <div className="pt-3 border-t border-[#263140] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#C2B280]">
                  Политический строй:{' '}
                  <strong className="text-[#F3E5AB]">
                    {globalEconomy.politicalPendulum === 'oligarchy'
                      ? 'Власть Олигархии (-20% содержание рабов, 0 др. демосу)'
                      : globalEconomy.politicalPendulum === 'demos'
                        ? 'Власть Демоса (+85 др. гражданам из Казны)'
                        : 'Смешанный Полисный Строй (+40 др. диобелия гражданам)'}
                  </strong>
                </span>

                <button
                  type="button"
                  disabled={
                    isFrozenPending ||
                    econ.residencyStatus !== 'Местный гражданин (Полит)' ||
                    globalEconomy.politicalPendulum === 'oligarchy'
                  }
                  onClick={handleClaimCitizenDiobelia}
                  className="min-h-[40px] px-4 py-2 rounded btn-golden-stater text-xs cursor-pointer disabled:opacity-40"
                >
                  {econ.residencyStatus !== 'Местный гражданин (Полит)'
                    ? 'Выплаты Казны доступны только гражданам (Политам)'
                    : globalEconomy.politicalPendulum === 'oligarchy'
                      ? 'При Олигархии выплаты демосу отменены'
                      : `Получить выплату гражданина из Казны (+${
                          globalEconomy.politicalPendulum === 'demos' ? 85 : 40
                        } др.)`}
                </button>
              </div>
            </div>

            {/* Right 6 cols: GM / Archon / Strategos Macro Controls */}
            <div className="lg:col-span-6 p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-epigraphic text-xs uppercase text-[#E5C158] flex items-center gap-1.5">
                  <Crown className="w-4 h-4" />
                  <span>
                    Рычаги Архонта, Стратега и ГМа (Маятник и Рынок Рабов)
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                    Политический маятник полиса:
                  </label>
                  <div className="wax-recess px-2.5 py-2">
                    <select
                      value={globalEconomy.politicalPendulum}
                      onChange={(e) => {
                        sound.playStoneTap();
                        onUpdateGlobalEconomy({
                          ...globalEconomy,
                          politicalPendulum:
                            e.target.value as PoliticalEconomyPendulum,
                        });
                      }}
                      className="w-full bg-[#0B0F14] text-xs font-bold text-[#F3E5AB] focus:outline-none cursor-pointer"
                    >
                      <option value="oligarchy">
                        Олигархия (Льготы рабовладельцам)
                      </option>
                      <option value="balanced">
                        Равновесие (Диобелия 40 др.)
                      </option>
                      <option value="demos">
                        Демос (Диобелия 85 др., налог на богачей)
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-epigraphic uppercase text-[#C2B280] mb-1">
                    Режим рынка рабов Синопы:
                  </label>
                  <div className="wax-recess px-2.5 py-2">
                    <select
                      value={globalEconomy.slaveMarketRegime}
                      onChange={(e) => {
                        sound.playStoneTap();
                        const nextRegime = e.target.value as SlaveMarketRegime;
                        onUpdateGlobalEconomy({
                          ...globalEconomy,
                          slaveMarketRegime: nextRegime,
                          slaveMarketPool:
                            nextRegime === 'war_flood'
                              ? Math.max(globalEconomy.slaveMarketPool, 40)
                              : globalEconomy.slaveMarketPool,
                        });
                      }}
                      className="w-full bg-[#0B0F14] text-xs font-bold text-[#E5C158] focus:outline-none cursor-pointer"
                    >
                      <option value="peace_deficit">
                        Мирное время: Дефицит (240 др./раб)
                      </option>
                      <option value="normal">
                        Обычный привоз (150 др./раб)
                      </option>
                      <option value="war_flood">
                        Военный поход Стратега (75 др./раб)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    sound.playCoinClink();
                    onUpdateGlobalEconomy({
                      ...globalEconomy,
                      slaveMarketPool: globalEconomy.slaveMarketPool + 10,
                    });
                  }}
                  className="px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer"
                >
                  + Пригнать партию пленников на рынок (+10 рабов)
                </button>
              </div>
            </div>
          </div>

          {/* Global Audit Log of 8-Digit Operation Codes (PN-XXXXXXXX) */}
          <div className="p-4 sm:p-5 rounded bg-[#1B232E] border border-[#263140] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#263140] pb-3">
              <div>
                <span className="font-epigraphic text-xs uppercase text-[#E5C158]">
                  Высшая Контрольная Комиссия (ВКК, Ст. 21–24) и Гейм-Мастера
                </span>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB] mt-0.5">
                  Единый Журнал Кодов Операций «PN-XXXXXXXX» ({filteredLogs.length})
                </h4>
              </div>

              <div className="wax-recess px-3 py-1.5 sm:w-72 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#C2B280] shrink-0" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Поиск по коду PN-... или имени"
                  className="w-full bg-transparent text-xs text-[#F3E5AB] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3.5 rounded border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    log.status === 'reverted'
                      ? 'bg-[#2A151B]/50 border-[#C0392B] opacity-75'
                      : log.status === 'verified'
                        ? 'bg-[#121820] border-[#4E8765]'
                        : 'bg-[#121820] border-[#D4AF37]/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#0B0F14] border border-[#D4AF37] text-[#E5C158] font-bold">
                        {log.code}
                      </span>
                      <span className="font-display font-bold text-[#F3E5AB]">
                        {log.characterName}
                      </span>
                      <span className="text-[#8EBDA2]">{log.locationHashtag}</span>
                      <span className="text-[#7C786A]">{log.createdAt}</span>
                      {log.status === 'verified' && (
                        <span className="px-2 py-0.5 rounded bg-[#2E5A44]/40 text-[#8EBDA2] text-[10px] font-epigraphic">
                          ✓ Проверено ВКК
                        </span>
                      )}
                      {log.status === 'reverted' && (
                        <span className="px-2 py-0.5 rounded bg-[#8B2635] text-[#F3E5AB] text-[10px] font-epigraphic">
                          ✕ Аннулировано (Откат)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#E2DAC2]">{log.summary}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const text = formatVkOperationStamp({
                          characterName: log.characterName,
                          polisName: log.polisName,
                          locationHashtag: log.locationHashtag,
                          code: log.code,
                          summary: log.summary,
                        });
                        navigator.clipboard?.writeText(text);
                        sound.playStoneTap();
                      }}
                      className="px-2.5 py-1 rounded bg-[#1B232E] border border-[#263140] text-[11px] text-[#C2B280] hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Код ВК</span>
                    </button>

                    {log.status !== 'reverted' && (
                      <>
                        {log.status !== 'verified' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyOperation(log.id)}
                            className="px-2.5 py-1 rounded bg-[#2E5A44]/40 hover:bg-[#2E5A44] border border-[#4E8765] text-[11px] text-[#8EBDA2] cursor-pointer"
                          >
                            ✓ Пост ВК есть
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRevertOperation(log)}
                          className="px-2.5 py-1 rounded bg-[#2A151B] hover:bg-[#8B2635] border border-[#C0392B] text-[11px] text-[#F1A9B2] flex items-center gap-1 cursor-pointer"
                          title="Аннулировать операцию и откатить начисленные драхмы/предметы, если игрок не выложил РП-пост в ВК"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Аннулировать (Откат)</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
