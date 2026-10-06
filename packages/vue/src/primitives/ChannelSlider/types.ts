import type { PrimitiveProps } from 'reka-ui'

export type ChannelSliderOrientation = 'horizontal' | 'vertical'

export interface ChannelSliderRootProps extends PrimitiveProps {
  /** Controlled channel value. */
  modelValue: number
  /** Accessible channel name announced by the thumb. */
  label: string
  /** Minimum channel value. */
  min?: number
  /** Maximum channel value. */
  max?: number
  /** Channel increment. */
  step?: number
  /** Slider orientation. */
  orientation?: ChannelSliderOrientation
  /** Prevents pointer and keyboard interaction. */
  disabled?: boolean
  /** Reverses the visual direction of the slider. */
  inverted?: boolean
  /** Formats the value announced by assistive technology. */
  formatValueText?: (value: number) => string
}

export type ChannelSliderPartProps = PrimitiveProps

export interface ChannelSliderRootSlotProps {
  value: number
  min: number
  max: number
  step: number
  disabled: boolean
  orientation: ChannelSliderOrientation
}

export interface ChannelSliderThumbSlotProps {
  value: number
  valueText: string
  label: string
}
