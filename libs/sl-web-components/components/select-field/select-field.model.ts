type ISelectFieldItem = {
  label: string;
  value: any;
};

type IDynamicSelectFieldItemProps = {
  [key: string]: unknown;
};

export type PartialDataSource = ISelectFieldItem & Partial<IDynamicSelectFieldItemProps>;
