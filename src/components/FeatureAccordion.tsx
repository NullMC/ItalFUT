/*
 * Adapted from 21st.dev Accordion 01 by designali-in:
 * https://21st.dev/@designali-in/components/accordion-01-1
 * MUI Accordion provides accessible disclosure controls without adding Radix.
 */
import { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import type { Module } from '../lib/catalog';
import { formatEuro } from '../lib/catalog';

export function FeatureAccordion({ modules }: { modules: Module[] }) {
  const [expanded, setExpanded] = useState<string | false>(modules[0]?.code ?? false);
  return <div className="if-feature-accordion" aria-label="Moduli aggiuntivi">
    {modules.map(module => <Accordion
      key={module.code}
      disableGutters
      elevation={0}
      expanded={expanded === module.code}
      onChange={(_, isExpanded) => setExpanded(isExpanded ? module.code : false)}
      className="if-feature-accordion__item"
    >
      <AccordionSummary
        expandIcon={<AddRoundedIcon className="if-feature-accordion__plus" />}
        aria-controls={`module-${module.code}-details`}
        id={`module-${module.code}-header`}
      >
        <span className="if-feature-accordion__heading">{module.name}</span>
        <span className="if-feature-accordion__cost">{formatEuro(module.monthly)}/mese</span>
      </AccordionSummary>
      <AccordionDetails id={`module-${module.code}-details`}>
        <p>{module.description}</p>
        <small>Modulo facoltativo · Configurabile insieme alla tua piattaforma</small>
      </AccordionDetails>
    </Accordion>)}
  </div>;
}
