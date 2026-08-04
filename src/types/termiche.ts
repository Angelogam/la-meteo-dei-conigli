export interface Termica {
  hour: string;
  speed: number;
  base: number;
  top: number;
  label?: string;
  color?: string;
}

export const TERMICHE_DEFAULT: Termica[] = [];
export default TERMICHE_DEFAULT;