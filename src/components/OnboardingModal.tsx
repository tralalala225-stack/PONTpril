import React, { useState } from 'react';
import { NATIONALITIES_DATA } from '../data/nationalitiesData';
import { INITIAL_POLEIS, PLAYER_FACTIONS_LIST } from '../data/initialRpData';
import {
  CharacterEconomyProfile,
  CharacterInventoryItem,
  NationalityId,
} from '../types/rpTypes';
import {
  SimpleEconomyGuideBlock,
  StarterWealthGeneratorBox,
} from './EconomyCodexPanel';
import {
  LaurelHeaderDivider,
  LaurelWreathBadge,
  MeanderDivider,
} from './PonticPrimitives';
import { sound } from '../utils/sound';
import { uploadPortraitWithSupabaseFallback } from '../utils/supabaseSync';
import {
  Dices,
  FastForward,
  Sparkles,
  UserPlus,
  BookOpen,
  Compass,
  Coins,
  CheckCircle2,
  ImagePlus,
  Trash2,
} from 'lucide-react';

export interface OnboardingPresetPayload {
  name: string;
  gender: 'Мужской' | 'Женский';
  age?: number;
  nationality: string;
  currentPolisId?: string;
  nobleHouseOrParty?: string;
  drachmas?: number;
  status?: string;
  position?: string;
  economy?: CharacterEconomyProfile;
  inventory?: CharacterInventoryItem[];
  appearance: string;
  personality: string;
  backstory: string;
  portraitUrl?: string;
}

interface OnboardingModalProps {
  onSkipOrClose: () => void;
  onApplyPresetToNewCharacter: (preset: OnboardingPresetPayload) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onSkipOrClose,
  onApplyPresetToNewCharacter,
}) => {
  const [step, setStep] = useState<'peoples' | 'mechanics'>('peoples');
  const [selectedNatId, setSelectedNatId] = useState<NationalityId>('hellenes');
  const [selectedGender, setSelectedGender] = useState<'Мужской' | 'Женский'>('Мужской');

  const currentNat =
    NATIONALITIES_DATA.find((n) => n.id === selectedNatId) || NATIONALITIES_DATA[0];

  const [pickedFirstName, setPickedFirstName] = useState<string>(currentNat.maleNames[0]);
  const [pickedFamily, setPickedFamily] = useState<string>(currentNat.familyOrPatronymics[0]);

  // Editable text fields initialized from presets, but freely editable by the user!
  const [customFullName, setCustomFullName] = useState<string>(
    `${currentNat.maleNames[0]} (${currentNat.familyOrPatronymics[0]})`
  );
  const [selectedAge, setSelectedAge] = useState<number>(28);
  const [selectedPolisId, setSelectedPolisId] = useState<string>(
    INITIAL_POLEIS[0]?.id || 'sinope'
  );
  const [selectedParty, setSelectedParty] = useState<string>(
    PLAYER_FACTIONS_LIST[0]
  );

  // Generated wealth & economy state (matching New Character Creation form)
  const [generatedDrachmas, setGeneratedDrachmas] = useState<number>(240);
  const [generatedStatus, setGeneratedStatus] = useState<string>(
    'Полноправный гражданин среднего достатка (Зевгит)'
  );
  const [generatedPosition, setGeneratedPosition] = useState<string>(
    'Владелец малой мастерской и гоплит'
  );
  const [generatedEconomy, setGeneratedEconomy] =
    useState<CharacterEconomyProfile | undefined>(undefined);
  const [generatedInventory, setGeneratedInventory] = useState<
    CharacterInventoryItem[] | undefined
  >(undefined);

  const [appearanceIdx, setAppearanceIdx] = useState<number>(0);
  const [appearanceText, setAppearanceText] = useState<string>(
    currentNat.appearances[0]
  );

  const [temperamentIdx, setTemperamentIdx] = useState<number>(0);
  const [temperamentText, setTemperamentText] = useState<string>(
    currentNat.temperaments[0]
  );

  const [backstoryIdx, setBackstoryIdx] = useState<number>(0);
  const [backstoryText, setBackstoryText] = useState<string>(
    currentNat.backstories[0]
  );

  // Portrait image attachment (file upload or URL)
  const [portraitUrl, setPortraitUrl] = useState<string>('');

  const selectedPolisName =
    INITIAL_POLEIS.find((p) => p.id === selectedPolisId)?.name || 'Синопа';

  const handleSelectNationality = (natId: NationalityId) => {
    sound.playStoneTap();
    setSelectedNatId(natId);
    const nat = NATIONALITIES_DATA.find((n) => n.id === natId) || NATIONALITIES_DATA[0];
    const pool = selectedGender === 'Мужской' ? nat.maleNames : nat.femaleNames;
    const first = pool[0];
    const fam = nat.familyOrPatronymics[0];
    setPickedFirstName(first);
    setPickedFamily(fam);
    setCustomFullName(`${first} (${fam})`);
    setAppearanceIdx(0);
    setAppearanceText(nat.appearances[0]);
    setTemperamentIdx(0);
    setTemperamentText(nat.temperaments[0]);
    setBackstoryIdx(0);
    setBackstoryText(nat.backstories[0]);
  };

  const handleSwitchGender = (gender: 'Мужской' | 'Женский') => {
    sound.playStoneTap();
    setSelectedGender(gender);
    const pool = gender === 'Мужской' ? currentNat.maleNames : currentNat.femaleNames;
    const first = pool[Math.floor(Math.random() * pool.length)];
    setPickedFirstName(first);
    setCustomFullName(`${first} (${pickedFamily})`);
  };

  const handlePickNameChip = (nm: string) => {
    sound.playStoneTap();
    setPickedFirstName(nm);
    setCustomFullName(`${nm} (${pickedFamily})`);
  };

  const handlePickFamily = (fam: string) => {
    setPickedFamily(fam);
    setCustomFullName(`${pickedFirstName} (${fam})`);
  };

  const handleRandomizeAll = () => {
    sound.playCoinClink();
    const pool =
      selectedGender === 'Мужской' ? currentNat.maleNames : currentNat.femaleNames;
    const first = pool[Math.floor(Math.random() * pool.length)];
    const fam =
      currentNat.familyOrPatronymics[
        Math.floor(Math.random() * currentNat.familyOrPatronymics.length)
      ];
    const nextAppIdx = Math.floor(Math.random() * currentNat.appearances.length);
    const nextTempIdx = Math.floor(Math.random() * currentNat.temperaments.length);
    const nextBackIdx = Math.floor(Math.random() * currentNat.backstories.length);

    setPickedFirstName(first);
    setPickedFamily(fam);
    setCustomFullName(`${first} (${fam})`);
    setSelectedAge(Math.floor(Math.random() * 32) + 18);
    setAppearanceIdx(nextAppIdx);
    setAppearanceText(currentNat.appearances[nextAppIdx]);
    setTemperamentIdx(nextTempIdx);
    setTemperamentText(currentNat.temperaments[nextTempIdx]);
    setBackstoryIdx(nextBackIdx);
    setBackstoryText(currentNat.backstories[nextBackIdx]);
  };

  const handlePortraitFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPortraitWithSupabaseFallback(file);
      sound.playStoneTap();
      setPortraitUrl(url);
    } catch {
      // Ignore upload error
    }
  };

  const handleCreateFromInspiration = () => {
    sound.playWaxSeal();
    onApplyPresetToNewCharacter({
      name: customFullName.trim() || `${pickedFirstName} (${pickedFamily})`,
      gender: selectedGender,
      age: Math.max(1, Math.min(150, Math.round(Number(selectedAge) || 28))),
      nationality: currentNat.name,
      currentPolisId: selectedPolisId,
      nobleHouseOrParty: selectedParty,
      drachmas: generatedDrachmas,
      status: generatedStatus,
      position: generatedPosition,
      economy: generatedEconomy,
      inventory: generatedInventory,
      appearance: appearanceText.trim() || currentNat.appearances[appearanceIdx],
      personality: temperamentText.trim() || currentNat.temperaments[temperamentIdx],
      backstory: backstoryText.trim() || currentNat.backstories[backstoryIdx],
      portraitUrl: portraitUrl.trim() || undefined,
    });
  };

  const namesList =
    selectedGender === 'Мужской' ? currentNat.maleNames : currentNat.femaleNames;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F14]/92 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl stele-panel border-2 border-[#D4AF37] p-4 sm:p-6 my-auto shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        {/* GIANT BOLD UNMISTAKABLE SKIP TRAINING BANNER BUTTON AT THE VERY TOP */}
        <div className="mb-5 p-3 sm:p-4 rounded bg-[#1B232E] border-2 border-[#E5C158] votive-glow flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="block font-epigraphic text-xs uppercase tracking-widest text-[#E5C158] font-bold">
              Уже знаете правила Понта или хотите сразу к реестру и карте?
            </span>
            <p className="text-xs sm:text-sm text-[#E2DAC2] mt-0.5">
              Обучалку и генератор анкеты/достатка можно открыть повторно в любой момент из верхней панели!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playCoinClink();
              onSkipOrClose();
            }}
            className="w-full sm:w-auto min-h-[52px] px-6 py-3 rounded btn-golden-stater text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            <FastForward className="w-5 h-5 shrink-0" />
            <span>ПРОПУСТИТЬ ОБУЧЕНИЕ — СРАЗУ В ПОНТ!</span>
          </button>
        </div>

        {/* Header & Step Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#263140] pb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <LaurelWreathBadge size="md" tone="gold">
              <span>П</span>
            </LaurelWreathBadge>
            <div className="min-w-0">
              <p className="font-epigraphic text-xs uppercase tracking-widest text-[#C2B280]">
                Вводный Путеводитель и Полный Генератор Анкеты · Эвксинский Понт
              </p>
              <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[#F3E5AB] leading-tight mt-0.5">
                Генератор Персонажа, Достатка, Товара и Обучение Экономике
              </h2>
            </div>
          </div>

          {/* 2 Separate Stacked Step Switcher Buttons (One Above the Other) */}
          <div className="flex flex-col gap-2 w-full lg:w-[360px] shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setStep('peoples');
              }}
              className={`w-full min-h-[40px] px-3.5 py-2 rounded text-xs font-epigraphic text-left flex items-center justify-between gap-2 cursor-pointer transition-all border ${
                step === 'peoples'
                  ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
                  : 'bg-[#0B0F14] text-[#C2B280] border-[#5E481E] hover:border-[#9A7B38] hover:text-[#F3E5AB]'
              }`}
            >
              <span>1. Генератор Анкеты, Класса, Товара и Ремесла</span>
              {step === 'peoples' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B0F14]/70 text-[#E5C158] border border-[#D4AF37]/50 shrink-0">
                  Активно
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playStoneTap();
                setStep('mechanics');
              }}
              className={`w-full min-h-[40px] px-3.5 py-2 rounded text-xs font-epigraphic text-left flex items-center justify-between gap-2 cursor-pointer transition-all border ${
                step === 'mechanics'
                  ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] votive-glow font-bold'
                  : 'bg-[#0B0F14] text-[#C2B280] border-[#5E481E] hover:border-[#9A7B38] hover:text-[#F3E5AB]'
              }`}
            >
              <span>2. Обучение Экономике, Ремеслу и Карте</span>
              {step === 'mechanics' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B0F14]/70 text-[#E5C158] border border-[#D4AF37]/50 shrink-0">
                  Активно
                </span>
              )}
            </button>
          </div>
        </div>

        {step === 'peoples' ? (
          <div className="mt-5 space-y-5">
            {/* Nationality Selector Strip */}
            <div>
              <p className="font-epigraphic text-xs uppercase tracking-wider text-[#C2B280] mb-2">
                Выберите народность Причерноморья для вдохновения (или сразу настройте анкету и достаток ниже):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {NATIONALITIES_DATA.map((nat) => {
                  const active = nat.id === selectedNatId;
                  return (
                    <button
                      key={nat.id}
                      type="button"
                      onClick={() => handleSelectNationality(nat.id)}
                      className={`p-3 rounded text-left transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#1B232E] border-[#D4AF37] votive-glow'
                          : 'bg-[#121820] border-[#263140] hover:border-[#9A7B38]'
                      }`}
                    >
                      <span className="block font-epigraphic text-[10px] text-[#C2B280]">
                        {nat.greekSubtitle}
                      </span>
                      <span className="block font-display text-sm sm:text-base font-bold text-[#F3E5AB] mt-0.5">
                        {nat.name}
                      </span>
                      <span className="block text-xs text-[#C2B280] mt-1 line-clamp-1">
                        {nat.homeland}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Nationality Lore + Editable Generator & Portrait Attachment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 6 cols: Name Lists, Polis/Party & Portrait Image Attachment */}
              <div className="lg:col-span-6 bg-[#1B232E] border border-[#9A7B38]/60 rounded p-4 space-y-4">
                <div>
                  <span className="font-epigraphic text-xs text-[#E5C158] uppercase tracking-wider">
                    Родина: {currentNat.homeland}
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#F3E5AB] mt-0.5">
                    {currentNat.name}
                  </h3>
                  <p className="text-sm text-[#E2DAC2] mt-1.5 leading-relaxed">
                    {currentNat.summary}
                  </p>
                </div>

                <MeanderDivider />

                {/* Gender Toggle + Randomize Button */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-[#0B0F14] p-1 rounded border border-[#5E481E]">
                    {(['Мужской', 'Женский'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleSwitchGender(g)}
                        className={`min-h-[36px] px-3 py-1 rounded-xs text-xs font-epigraphic cursor-pointer transition-colors ${
                          selectedGender === g
                            ? 'bg-[#263140] text-[#E5C158] border border-[#D4AF37]/60'
                            : 'text-[#C2B280] hover:text-[#F3E5AB]'
                        }`}
                      >
                        {g === 'Мужской' ? 'Мужские Имена' : 'Женские Имена'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleRandomizeAll}
                    className="min-h-[38px] px-3.5 py-1.5 rounded btn-basalt-stele text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Dices className="w-4 h-4 text-[#E5C158]" />
                    <span>Случайный Образ и Имя</span>
                  </button>
                </div>

                {/* Clickable Big Name List */}
                <div>
                  <span className="block font-epigraphic text-xs uppercase tracking-wider text-[#C2B280] mb-1.5">
                    Готовые имена народа ({namesList.length} вариантов — нажмите или впишите своё справа):
                  </span>
                  <div className="wax-recess p-2.5 max-h-[125px] overflow-y-auto flex flex-wrap gap-1.5">
                    {namesList.map((nm) => {
                      const isPicked = pickedFirstName === nm;
                      return (
                        <button
                          key={nm}
                          type="button"
                          onClick={() => handlePickNameChip(nm)}
                          className={`px-2.5 py-1 rounded text-xs font-body cursor-pointer transition-colors border ${
                            isPicked
                              ? 'bg-[#263140] text-[#E5C158] border-[#D4AF37] font-semibold'
                              : 'bg-[#121820] text-[#E2DAC2] border-[#263140] hover:border-[#9A7B38]'
                          }`}
                        >
                          {nm}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Patronymic / Clan Picker + Polis & Faction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block font-epigraphic text-xs uppercase tracking-wider text-[#C2B280] mb-1">
                      Прозвище или род:
                    </span>
                    <div className="wax-recess px-3 py-2">
                      <select
                        value={pickedFamily}
                        onChange={(e) => handlePickFamily(e.target.value)}
                        className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none cursor-pointer"
                      >
                        {currentNat.familyOrPatronymics.map((fam) => (
                          <option key={fam} value={fam}>
                            {fam}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="block font-epigraphic text-xs uppercase tracking-wider text-[#C2B280] mb-1">
                      Начальный Полис Понта:
                    </span>
                    <div className="wax-recess px-3 py-2">
                      <select
                        value={selectedPolisId}
                        onChange={(e) => setSelectedPolisId(e.target.value)}
                        className="w-full bg-[#0B0F14] text-xs text-[#E5C158] font-bold focus:outline-none cursor-pointer"
                      >
                        {INITIAL_POLEIS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block font-epigraphic text-xs uppercase tracking-wider text-[#C2B280] mb-1">
                    Знатный Род или Партия:
                  </span>
                  <div className="wax-recess px-3 py-2">
                    <select
                      value={selectedParty}
                      onChange={(e) => setSelectedParty(e.target.value)}
                      className="w-full bg-[#0B0F14] text-xs text-[#E2DAC2] focus:outline-none cursor-pointer"
                    >
                      {PLAYER_FACTIONS_LIST.map((pf) => (
                        <option key={pf} value={pf}>
                          {pf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Portrait / Image Attachment inside Onboarding */}
                <div className="pt-1 border-t border-[#263140] space-y-2">
                  <span className="block font-epigraphic text-xs uppercase tracking-wider text-[#E5C158]">
                    Прикрепить Изображение / Портрет Персонажа (Появится в Профиле):
                  </span>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {portraitUrl ? (
                      <div className="relative w-20 h-20 rounded border-2 border-[#D4AF37] overflow-hidden shrink-0 bg-[#0B0F14]">
                        <img
                          src={portraitUrl}
                          alt="Портрет персонажа"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPortraitUrl('')}
                          className="absolute top-1 right-1 p-1 rounded bg-[#0B0F14]/85 text-[#F1A9B2] hover:text-white cursor-pointer"
                          title="Удалить изображение"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded border border-dashed border-[#9A7B38] bg-[#0B0F14] flex flex-col items-center justify-center text-[#7C786A] shrink-0">
                        <ImagePlus className="w-6 h-6 text-[#C2B280]" />
                        <span className="text-[9px] font-epigraphic mt-1">Портрет</span>
                      </div>
                    )}

                    <div className="flex-1 w-full space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded btn-basalt-stele text-xs cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5 text-[#E5C158]" />
                        <span>Загрузить картинку с устройства</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePortraitFileUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="wax-recess px-2.5 py-1.5">
                        <input
                          type="text"
                          value={portraitUrl}
                          onChange={(e) => setPortraitUrl(e.target.value)}
                          placeholder="Или вставьте прямую ссылку (URL) на изображение..."
                          className="w-full bg-transparent text-xs text-[#E2DAC2] placeholder-[#7C786A] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 6 cols: Directly Editable Name, Appearance, Character & Backstory */}
              <div className="lg:col-span-6 bg-[#1B232E] border border-[#9A7B38]/60 rounded p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#263140] pb-2">
                  <div>
                    <span className="font-epigraphic text-xs text-[#C2B280] uppercase">
                      Свободное Редактирование Образа (Можно Вписать Свой Текст)
                    </span>
                    <h4 className="font-display text-base sm:text-lg font-bold text-[#E5C158]">
                      Используйте шаблон или впишите всё сами:
                    </h4>
                  </div>
                  <Sparkles className="w-5 h-5 text-[#E5C158] shrink-0" />
                </div>

                {/* Editable Full Name & Age */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-9">
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Имя, Отчество / Прозвище Персонажа (можно вписать своё):
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="text"
                        value={customFullName}
                        onChange={(e) => setCustomFullName(e.target.value)}
                        placeholder="Впишите любое имя и прозвище персонажа..."
                        className="w-full bg-transparent text-sm font-bold text-[#F3E5AB] placeholder-[#7C786A] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-epigraphic text-xs uppercase text-[#C2B280] mb-1">
                      Возраст (лет):
                    </label>
                    <div className="wax-recess px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={150}
                        value={selectedAge}
                        onChange={(e) => setSelectedAge(Number(e.target.value))}
                        className="w-full bg-transparent text-sm font-bold text-[#E5C158] text-center tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Editable Appearance + Preset Cycler */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-epigraphic text-xs uppercase text-[#C2B280]">
                      Внешность (редактируйте или листайте примеры {appearanceIdx + 1}/{currentNat.appearances.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playStoneTap();
                        const next = (appearanceIdx + 1) % currentNat.appearances.length;
                        setAppearanceIdx(next);
                        setAppearanceText(currentNat.appearances[next]);
                      }}
                      className="text-xs font-epigraphic text-[#E5C158] hover:underline cursor-pointer"
                    >
                      Другой типаж →
                    </button>
                  </div>
                  <div className="wax-recess p-2.5">
                    <textarea
                      rows={3}
                      value={appearanceText}
                      onChange={(e) => setAppearanceText(e.target.value)}
                      placeholder="Опишите внешность, одежду и приметы вашего персонажа..."
                      className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] leading-relaxed focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Editable Temperament + Preset Cycler */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-epigraphic text-xs uppercase text-[#C2B280]">
                      Характер и нрав (редактируйте или листайте {temperamentIdx + 1}/{currentNat.temperaments.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playStoneTap();
                        const next = (temperamentIdx + 1) % currentNat.temperaments.length;
                        setTemperamentIdx(next);
                        setTemperamentText(currentNat.temperaments[next]);
                      }}
                      className="text-xs font-epigraphic text-[#E5C158] hover:underline cursor-pointer"
                    >
                      Другой характер →
                    </button>
                  </div>
                  <div className="wax-recess p-2.5">
                    <textarea
                      rows={2}
                      value={temperamentText}
                      onChange={(e) => setTemperamentText(e.target.value)}
                      placeholder="Опишите нрав, привычки и взгляды персонажа..."
                      className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] leading-relaxed focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Editable Backstory + Preset Cycler */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-epigraphic text-xs uppercase text-[#C2B280]">
                      Предыстория (редактируйте или листайте {backstoryIdx + 1}/{currentNat.backstories.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playStoneTap();
                        const next = (backstoryIdx + 1) % currentNat.backstories.length;
                        setBackstoryIdx(next);
                        setBackstoryText(currentNat.backstories[next]);
                      }}
                      className="text-xs font-epigraphic text-[#E5C158] hover:underline cursor-pointer"
                    >
                      Другая судьба →
                    </button>
                  </div>
                  <div className="wax-recess p-2.5">
                    <textarea
                      rows={3}
                      value={backstoryText}
                      onChange={(e) => setBackstoryText(e.target.value)}
                      placeholder="Впишите свою собственную предысторию или дополните предложенную..."
                      className="w-full bg-transparent text-xs sm:text-sm text-[#E2DAC2] leading-relaxed focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FULL STARTER WEALTH, CLASS, LOCAL/NON-LOCAL, RANDOM GOODS & TECHNE GENERATOR (Same as New Character Sheet!) */}
            <StarterWealthGeneratorBox
              polisId={selectedPolisId}
              polisName={selectedPolisName}
              nationality={currentNat.name}
              onApplyGeneratedPackage={(pkg) => {
                setGeneratedDrachmas(pkg.drachmas);
                setGeneratedStatus(pkg.status);
                setGeneratedPosition(pkg.position);
                setGeneratedEconomy(pkg.economy);
                setGeneratedInventory(pkg.inventory);
              }}
            />

            {/* Primary CTA: Transfer Image, Bio, Class, Goods & Economy to Character Creation */}
            <button
              type="button"
              onClick={handleCreateFromInspiration}
              className="w-full min-h-[50px] px-5 py-3 rounded btn-golden-stater text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span>
                Перенести этот образ, выбранный класс, товар и достаток в создание анкеты
              </span>
            </button>
          </div>
        ) : (
          /* Step 2: Full Economy, Techne, Oikos & Map Guide */
          <div className="mt-5 space-y-5">
            <SimpleEconomyGuideBlock />

            <LaurelHeaderDivider label="Три Основы Ролевой Понта" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1B232E] border border-[#9A7B38]/60 rounded p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#E5C158] font-epigraphic text-xs uppercase">
                  <BookOpen className="w-4 h-4" />
                  <span>1. Одна Своя Анкета и Ключевые Вехи</span>
                </div>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                  Портрет, Биография и Развитие
                </h4>
                <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                  У каждого игрока может быть только 1 живая личная анкета. В профиле отображается портрет, возраст, биография и список ключевых событий — туда вы или ГМ записываете победы на ивентах и важные повороты судьбы.
                </p>
              </div>

              <div className="bg-[#1B232E] border border-[#9A7B38]/60 rounded p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#E5C158] font-epigraphic text-xs uppercase">
                  <Coins className="w-4 h-4" />
                  <span>2. Ойкос, Навык Ремесла и Коды ВК</span>
                </div>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                  Живая экономика без ожидания ГМ
                </h4>
                <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                  Собирайте ренту с рабов или трудитесь руками, куйте изделия с шансом на Шедевр Мастера, берите подряды на Агоре и отправляйте караваны со стражей. Каждое действие сразу даёт код <code className="text-[#E5C158]">PN-XXXXXXXX</code> для вставки в пост ВК!
                </p>
              </div>

              <div className="bg-[#1B232E] border border-[#9A7B38]/60 rounded p-4 space-y-2">
                <div className="flex items-center gap-2 text-[#E5C158] font-epigraphic text-xs uppercase">
                  <Compass className="w-4 h-4" />
                  <span>3. План Синопы и 18 Кварталов</span>
                </div>
                <h4 className="font-display text-lg font-bold text-[#F3E5AB]">
                  Интерактивная карта Синопы
                </h4>
                <p className="text-xs sm:text-sm text-[#E2DAC2] leading-relaxed">
                  При выборе Синопы на карте мира открывается подробный интерактивный план столицы: 18 подсвечивающихся зон (Зерно, Агора, Южный Порт, РАБЫ, Малая Олимпия, Вино и др.) и 12 точек интереса.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Confirmation / Skip Bar */}
        <div className="mt-6 pt-4 border-t border-[#263140] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[#C2B280]">
            Совет: вы всегда можете открыть обучение экономике или генератор достатка прямо в своём Профиле и в верхней панели.
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playStoneTap();
              onSkipOrClose();
            }}
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded btn-basalt-stele text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E5C158]" />
            <span>Закрыть обучение и перейти в приложение</span>
          </button>
        </div>
      </div>
    </div>
  );
};
