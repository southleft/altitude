type ISelectItem = {
  label: string;
  value: any;
};

type IDynamicSelectItemProps = {
  [key: string]: unknown;
};

export type PartialDataSource = ISelectItem & Partial<IDynamicSelectItemProps>;
