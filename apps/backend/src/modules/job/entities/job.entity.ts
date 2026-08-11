export class JobEntity {
  id!: string;
  title!: string;
  company!: string;
  location!: string;
  country!: string;
  url!: string;
  platform!: string;
  description!: string;
  requirements!: string[];
  createdAt!: Date;
}
