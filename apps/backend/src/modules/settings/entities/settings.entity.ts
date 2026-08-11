export class SettingsEntity {
  id!: string;
  dailyApplicationLimit!: number;
  targetCountries!: string[];
  requireHumanApproval!: boolean;
  updatedAt!: Date;
}
