import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import MaterialTextField from '@material-ui/core/TextField';

const inputLabelBase = {
  transform: 'none',
  transition: 'none',
  position: 'initial',
  color: '#8e8ca5',
};

const styles = {
  materialLabel: {
    '&$materialFocused': {
      color: '#E5E4FA',
    },
    '&$materialError': {
      color: '#E74C3C',
    },
    fontWeight: '400',
    color: '#8e8ca5',
  },
  materialFocused: {},
  materialUnderline: {
    '&:after': {
      borderBottom: `2px solid #6E42CA`,
    },
  },
  materialError: {},
  materialWhitePaddedRoot: {
    color: '#E5E4FA',
  },
  materialWhitePaddedInput: {
    padding: '8px',
    color: '#E5E4FA',
    '&::placeholder': {
      color: '#aeaeae',
    },
  },
  materialWhitePaddedFocused: {
    color: '#fff',
  },
  materialWhitePaddedUnderline: {
    '&:after': {
      borderBottom: '2px solid #fff',
    },
  },
  // Non-material styles
  formLabel: {
    color: '#8e8ca5',
    '&$formLabelFocused': {
      color: '#E5E4FA',
    },
    '&$materialError': {
      color: '#E74C3C',
    },
  },
  formLabelFocused: {},
  inputFocused: {},
  inputRoot: {
    'label + &': {
      marginTop: '9px',
    },
    border: '1px solid #2f2f45',
    height: '48px',
    borderRadius: '6px',
    padding: '0 16px',
    display: 'flex',
    color: '#E5E4FA',
    alignItems: 'center',
    '&$inputFocused': {
      border: '1px solid #6E42CA',
      color: '#E5E4FA',
    },
    '&$inputDisabled': {
      color: '#8e8ca5',
    },
  },
  largeInputLabel: {
    ...inputLabelBase,
    fontSize: '1rem',
  },
  inputLabel: {
    ...inputLabelBase,
    fontSize: '.75rem',
  },
  inputMultiline: {
    lineHeight: 'initial !important',
  },
  disabledInput: {
    "& .Mui-disabled": {
      color: "#8e8ca5"
    }
  }
};

const getMaterialThemeInputProps = ({
  dir,
  classes: { materialLabel, materialFocused, materialError, materialUnderline },
  startAdornment,
  min,
  max,
  autoComplete,
}) => ({
  InputLabelProps: {
    classes: {
      root: materialLabel,
      focused: materialFocused,
      error: materialError,
    },
  },
  InputProps: {
    startAdornment,
    classes: {
      underline: materialUnderline,
    },
    inputProps: {
      dir,
      min,
      max,
      autoComplete,
    },
  },
});

const getMaterialWhitePaddedThemeInputProps = ({
  dir,
  classes: {
    materialWhitePaddedRoot,
    materialWhitePaddedFocused,
    materialWhitePaddedInput,
    materialWhitePaddedUnderline,
  },
  startAdornment,
  min,
  max,
  autoComplete,
}) => ({
  InputProps: {
    startAdornment,
    classes: {
      root: materialWhitePaddedRoot,
      focused: materialWhitePaddedFocused,
      input: materialWhitePaddedInput,
      underline: materialWhitePaddedUnderline,
    },
    inputProps: {
      dir,
      min,
      max,
      autoComplete,
    },
  },
});

const getBorderedThemeInputProps = ({
  dir,
  classes: {
    formLabel,
    formLabelFocused,
    materialError,
    largeInputLabel,
    inputLabel,
    inputRoot,
    input,
    inputFocused,
  },
  largeLabel,
  startAdornment,
  min,
  max,
  autoComplete,
}) => ({
  InputLabelProps: {
    shrink: true,
    className: largeLabel ? largeInputLabel : inputLabel,
    classes: {
      root: formLabel,
      focused: formLabelFocused,
      error: materialError,
    },
  },
  InputProps: {
    startAdornment,
    disableUnderline: true,
    classes: {
      root: inputRoot,
      input,
      focused: inputFocused,
    },
    inputProps: {
      dir,
      min,
      max,
      autoComplete,
    },
  },
});

const themeToInputProps = {
  material: getMaterialThemeInputProps,
  bordered: getBorderedThemeInputProps,
  'material-white-padded': getMaterialWhitePaddedThemeInputProps,
};

const TextField = ({
  'data-testid': dataTestId,
  error,
  classes,
  theme,
  startAdornment,
  largeLabel,
  dir,
  min,
  max,
  autoComplete,
  onPaste,
  ...textFieldProps
}) => {
  const inputProps = themeToInputProps[theme]({
    classes,
    startAdornment,
    largeLabel,
    dir,
    min,
    max,
    autoComplete,
  });

  if (onPaste || dataTestId) {
    if (!inputProps.InputProps) {
      inputProps.InputProps = {};
    }
    if (!inputProps.InputProps.inputProps) {
      inputProps.InputProps.inputProps = {};
    }
    inputProps.InputProps.inputProps.onPaste = onPaste;
    inputProps.InputProps.inputProps['data-testid'] = dataTestId;
  }

  return (
    <MaterialTextField
      error={Boolean(error)}
      helperText={error}
      {...inputProps}
      {...textFieldProps}
    />
  );
};

TextField.defaultProps = {
  error: null,
  dir: 'auto',
  theme: 'bordered',
};

TextField.propTypes = {
  /**
   * A test ID that gets set on the input element
   */
  'data-testid': PropTypes.string,
  /**
   * Show error message
   */
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
  /**
   * Add custom CSS class
   */
  classes: PropTypes.object,
  dir: PropTypes.string,
  /**
   * Give theme to the text field
   */
  theme: PropTypes.oneOf(['bordered', 'material', 'material-white-padded']),
  startAdornment: PropTypes.element,
  /**
   * Show large label
   */
  largeLabel: PropTypes.bool,
  /**
   * Define min number input
   */
  min: PropTypes.number,
  /**
   * Define max number input
   */
  max: PropTypes.number,
  /**
   * Show auto complete text
   */
  autoComplete: PropTypes.string,
  onPaste: PropTypes.func,
};

export default withStyles(styles)(TextField);
