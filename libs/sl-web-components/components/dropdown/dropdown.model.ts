type IDropdownItem = {
  label: string;
  value: any;
};

type IDynamicDropdownItemProps = {
  [key: string]: unknown;
};

export type PartialDataSource = IDropdownItem & Partial<IDynamicDropdownItemProps>;