"use client";

import { useState } from "react";
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as ReactAriaTextField,
} from "react-aria-components";
import type {
  CGPPasswordFieldProps,
  CGPTextFieldProps,
} from "./contracts";
import { CGPIconButton } from "./Button";
import { cgpStateClassName } from "./stateClassNames";

function EyeIcon({ concealed }: { concealed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="cgp-password-field__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {concealed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

interface FieldBodyProps extends CGPTextFieldProps {
  passwordControl?: {
    isRevealed: boolean;
    revealLabel: string;
    concealLabel: string;
    onToggle: () => void;
  };
}

function FieldBody({
  label,
  description,
  errorMessage,
  className,
  type = "text",
  autoComplete,
  placeholder,
  passwordControl,
  ...textFieldProps
}: FieldBodyProps) {
  return (
    <ReactAriaTextField
      {...textFieldProps}
      className={(states) =>
        cgpStateClassName(
          "cgp-field",
          [passwordControl ? "cgp-password-field" : "", className]
            .filter(Boolean)
            .join(" "),
          states,
        )
      }
    >
      <Label className="cgp-field__label">
        {label}
        {textFieldProps.isRequired ? (
          <span aria-hidden="true" className="cgp-field__required">
            *
          </span>
        ) : null}
      </Label>
      <div className="cgp-field__control">
        <Input
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={(states) =>
            cgpStateClassName("cgp-field__input", undefined, states)
          }
        />
        {passwordControl ? (
          <CGPIconButton
            type="button"
            variant="quiet"
            size="sm"
            className="cgp-password-field__toggle"
            aria-label={
              passwordControl.isRevealed
                ? passwordControl.concealLabel
                : passwordControl.revealLabel
            }
            onPress={passwordControl.onToggle}
          >
            <EyeIcon concealed={passwordControl.isRevealed} />
          </CGPIconButton>
        ) : null}
      </div>
      {description ? (
        <Text slot="description" className="cgp-field__description">
          {description}
        </Text>
      ) : null}
      {errorMessage ? (
        <FieldError className="cgp-field__error">{errorMessage}</FieldError>
      ) : null}
    </ReactAriaTextField>
  );
}

export function CGPTextField(props: CGPTextFieldProps) {
  return <FieldBody {...props} />;
}

export function CGPPasswordField({
  revealLabel = "Hiện mật khẩu",
  concealLabel = "Ẩn mật khẩu",
  ...props
}: CGPPasswordFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <FieldBody
      {...props}
      type={isRevealed ? "text" : "password"}
      passwordControl={{
        isRevealed,
        revealLabel,
        concealLabel,
        onToggle: () => setIsRevealed((current) => !current),
      }}
    />
  );
}
