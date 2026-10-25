import { Banknote, Code, Cpu, FileText, FlaskConical, Lightbulb, Newspaper, Rocket, Scale, ShieldAlert, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  modelle: Cpu, neuigkeiten: Newspaper, sicherheit: ShieldAlert, gesetze: Scale, vertraege: FileText, ideen: Lightbulb,
  startups: Rocket, preise: Tag, opensource: Code, forschung: FlaskConical, funding: Banknote,
};
