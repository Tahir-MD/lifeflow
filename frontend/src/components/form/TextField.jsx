import React, { useState } from "react";
import FormField from "./FormField.jsx";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { cleanName } from "../../utils/validators.js";

// kind="name"  -> numbers and symbols are blocked while typing.
// kind="text" / "email" / "number" / "textarea" -> plain inputs with the same label / hint / error look.
export default function TextField({
  label, name, value, onChange, error, submitted, required = true, hint, placeholder,
  kind = "text", autoComplete, maxLength, min, max, rows, inputMode,
}) {
  const { t } = useI18n();
  const [touched, setTouched] = useState(false);
  const show = touched || submitted;
  const id = `f-${name}`;

  function handle(event) {
    let next = event.target.value;
    if (kind === "name") next = cleanName(next);
    onChange({ target: { name, value: next } });
  }

  const common = {
    id, name, value, onChange: handle, onBlur: () => setTouched(true), required,
    placeholder: placeholder ? t(placeholder) : undefined, autoComplete, maxLength,
    "aria-invalid": show && error ? "true" : "false",
  };

  return (
    <FormField label={label} hint={hint} error={error} show={show} required={required} htmlFor={id}>
      {kind === "textarea" ? (
        <textarea rows={rows || 3} {...common} />
      ) : (
        <input
          {...common}
          type={kind === "email" ? "email" : kind === "number" ? "number" : "text"}
          inputMode={inputMode || (kind === "number" ? "numeric" : undefined)}
          min={min} max={max}
          autoCapitalize={kind === "name" ? "words" : undefined}
        />
      )}
    </FormField>
  );
}
