import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "./ToastContext.jsx";
import ContactButtons from "./ContactButtons.jsx";
import ChatBox from "./ChatBox.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { getPatientOffers, answerPatientOffer, markOfferReceived } from "../services/api";

/** Donors who offered blood for this patient: Accept / No thanks, and later "Received" / "Not received". */
export default function PatientOffers({ onChanged }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [offers, setOffers] = useState([]);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try { setOffers((await getPatientOffers()).data); } catch (e) { setOffers([]); }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  async function answer(id, accept) {
    try {
      await answerPatientOffer(id, accept);
      toast(t("Saved successfully."));
      setNote(accept ? "You accepted the donor. Their phone number is now shown." : "You said no thanks.");
    } catch (e) { setNote("Could not save your answer. Please try again."); }
    load(); if (onChanged) onChanged();
  }
  async function received(id, yes) {
    try {
      await markOfferReceived(id, yes);
      toast(t("Saved successfully."));
      setNote(yes ? "Thank you. The donation is counted." : "Noted. The donation was not counted.");
    } catch (e) { setNote("Could not save your answer. Please try again."); }
    load(); if (onChanged) onChanged();
  }

  if (offers.length === 0) return null;
  return (
    <div className="card">
      <h2>{t("Donors who want to help you")}</h2>
      {note && <p className="notice-text">{t(note)}</p>}
      {offers.map((o) => (
        <div className="offer-card" key={o.id}>
          <div>
            <span className="badge">{o.donor_blood_type}</span> &nbsp;
            <strong>{o.donor_name}</strong> · {o.units} {t("bag(s)")}
          </div>
          <ChatBox donationId={o.id} />
          {o.status === "offered" && (
            <>
              <p className="subtitle">{t("Do you want to take this donor's blood?")}</p>
              <div className="offer-actions">
                <button type="button" onClick={() => answer(o.id, true)}>{t("Yes, accept")}</button>
                <button type="button" className="btn-no" onClick={() => answer(o.id, false)}>{t("No thanks")}</button>
              </div>
            </>
          )}
          {o.status === "accepted" && (
            <>
              <p className="notice-text">{t("Phone:")} <strong>{o.donor_phone}</strong></p>
              <ContactButtons phone={o.donor_phone} email={o.donor_email} />
              <p className="subtitle">{t(o.arrived ? "The donor has arrived. Did you receive the blood?" : o.on_the_way ? "The donor is on the way." : "Waiting for the donor to start.")}</p>
              {o.arrived && (
                <div className="offer-actions">
                  <button type="button" onClick={() => received(o.id, true)}>{t("Yes, received")}</button>
                  <button type="button" className="btn-no" onClick={() => received(o.id, false)}>{t("Not received")}</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
