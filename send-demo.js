/**
 * Demo Script: Sends a direct POST request with 25 diverse form fields
 * to verify how the Node backend formats all Google Form / web input types.
 */

async function send25FieldDemo() {
  const backendUrl = "http://localhost:3000/submit/comprehensive-demo";

  const payload = {
    full_name: "Alexander Mitchell",
    email: "alexander.mitchell@example.com",
    phone: "+1 416-555-9876",
    organization_name: "Global Maritime Logistics Corp",
    job_title: "Senior Operations Director",
    department: "Port Logistics & Supply Chain",
    preferred_contact_method: "Email & WhatsApp",
    services_of_interest: [
      "Seafarer Welfare Support",
      "Port Wi-Fi Infrastructure",
      "Emergency Transportation",
      "Volunteer Sponsorship"
    ],
    urgency_level: "High - Within 24 Hours",
    estimated_vessel_arrivals_per_month: 12,
    annual_budget_range: "$25,000 - $50,000 CAD",
    preferred_visit_date: "2026-09-15",
    preferred_time_slot: "10:30 AM - 1:00 PM EDT",
    port_terminal_location: "Pier 35, East Harbor Quay, Port of Toronto",
    country_of_registration: "Canada / Panama",
    number_of_crew_members: 24,
    primary_spoken_languages: ["English", "Tagalog", "Ukrainian", "Spanish"],
    special_accommodations_required: "Yes - Transportation & Wi-Fi",
    dietary_or_cultural_needs: "Halal & Vegetarian options for crew lounge",
    safety_briefing_completed: "Yes - Certified Level 2",
    company_website: "https://globalmaritimelogistics.example.com",
    hear_about_us: "Annual Maritime Industry Conference 2026",
    additional_inquiry_details:
      "We would like to establish an ongoing annual corporate partnership with Mission to Seafarers Toronto to support arriving seafarers with practical welfare goods, high-speed Wi-Fi hotspots, and monthly care packages.",
    terms_and_conditions_agreed: "I Agree to Privacy Policy & Terms",
    subscribed_to_newsletter: "Yes, please send monthly port updates",
  };

  console.log(`Sending 25-field demo form to: ${backendUrl} ...`);
  console.log(`Total fields in payload: ${Object.keys(payload).length}`);

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("\n==========================================");
    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    console.log("Response Body:", result);
    console.log("==========================================");

    if (response.ok && result.success) {
      console.log("\nSUCCESS! The 25-field email was formatted and dispatched to mayur23221@gmail.com!");
      console.log("Check your email inbox to view the table presentation.");
    } else {
      console.error("\nFAILED:", result.message);
    }
  } catch (error) {
    console.error("Connection error:", error.message);
  }
}

send25FieldDemo();
