const N8N_EMAIL_URL =
  import.meta.env.VITE_N8N_EMAIL_URL ||
  "https://n8napp.getalloro.com/webhook/alloro-email-service";

interface EmailServiceParams {
  recipientEmail: string;
  auditId: string;
  businessName?: string;
}

interface ErrorNotificationParams {
  userEmail: string;
  auditId: string;
  errorMessage: string | null;
  practiceInfo?: string;
}

/**
 * Generates the HTML email template with Alloro branding
 */
function generateEmailHTML(
  auditId: string,
  recipientEmail: string,
  businessName?: string,
): string {
  const reportLink = `https://audit.getalloro.com?audit_id=${auditId}`;
  const greeting = businessName
    ? `Greetings to ${businessName} -- ${recipientEmail}`
    : `Greetings -- ${recipientEmail}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Alloro Practice Analysis Report</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #d66853;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    .button:hover {
      background-color: #c55a47;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    Your complete Alloro practice analysis report is ready
  </div>
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width: 600px; width: 100%;">
          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="https://app.getalloro.com" target="_blank">
                <img src="https://app.getalloro.com/logo.png" alt="Alloro" width="140" style="display: block; height: auto;" />
              </a>
            </td>
          </tr>
          
          <!-- Main content card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td class="content" style="padding: 40px;">
                    
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background-color: #d6685315; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <span style="font-size: 32px;">📊</span>
      </div>
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #166534; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          Report Ready
        </span>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #212D40;">
        Your Practice Analysis is Complete
      </h1>
    </div>
  
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
        Hi, ${greeting}
      </p>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #334155;">
We've completed a comprehensive analysis of your practice's digital presence. Your full report includes:
<br><br>
✓ Website Performance Grade & Score<br>
✓ Google Business Profile Readiness Analysis<br>
✓ Local Ranking Position & Insights<br>
✓ Detailed Performance Metrics<br>
✓ Actionable Recommendations<br>
✓ Competitor Analysis
      </p>
    </div>
  
    <div style="text-align: center; margin-top: 24px;">
      <a href="${reportLink}" class="button" style="display: inline-block; padding: 14px 28px; background-color: #d66853; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        View Your Full Report
      </a>
    </div>
  
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 24px 0;">
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
        </td>
      </tr>
    </table>
  
    <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
      Need help implementing these recommendations?
      <br>
      <a href="https://calendar.app.google/yJsmRsEnBSfDTVyz8" style="color: #d66853; text-decoration: none;">
        Schedule a free strategy call with our team
      </a>
    </p>
  
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
                <a href="https://app.getalloro.com/dashboard" style="color: #64748b; text-decoration: none;">Dashboard</a>
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="https://app.getalloro.com/help" style="color: #64748b; text-decoration: none;">Help</a>
              </p>
              
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} Alloro. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">
                Sent from <span style="color: #d66853;">info@getalloro.com</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends email via n8n webhook
 */
export async function sendAuditReportEmail({
  recipientEmail,
  auditId,
  businessName,
}: EmailServiceParams): Promise<void> {
  const emailBody = generateEmailHTML(auditId, recipientEmail, businessName);

  const payload = {
    cc: [],
    bcc: ["info@getalloro.com"],
    body: emailBody,
    from: "info@getalloro.com",
    subject: "📊 Your Alloro Practice Analysis Report",
    fromName: "Alloro",
    recipients: [recipientEmail],
  };

  try {
    const response = await fetch(N8N_EMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Email service responded with status: ${response.status}`,
      );
    }

    // Check if response has content before trying to parse
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();
      console.log("Email sent successfully:", result);
    } else {
      // If no JSON response, just log success
      console.log("Email sent successfully (no JSON response)");
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email. Please try again.");
  }
}

/**
 * Generates the HTML email template for error notification to Alloro team
 */
function generateErrorNotificationHTML({
  userEmail,
  auditId,
  errorMessage,
  practiceInfo,
}: ErrorNotificationParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Error - User Needs Help</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="https://app.getalloro.com/logo.png" alt="Alloro" width="140" style="display: block; height: auto;" />
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background-color: #fee2e2; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <span style="font-size: 32px;">⚠️</span>
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; padding: 4px 10px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Audit Failed
                  </span>
                </div>
                <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #212D40;">
                  A User Needs Help
                </h1>
              </div>

              <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">
                  <strong>User Email:</strong> ${userEmail}
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;">
                  <strong>Audit ID:</strong> ${auditId}
                </p>
                ${practiceInfo ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;"><strong>Practice:</strong> ${practiceInfo}</p>` : ""}
                ${errorMessage ? `<p style="margin: 0; font-size: 14px; color: #ef4444;"><strong>Error:</strong> ${errorMessage}</p>` : ""}
              </div>

              <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center;">
                Please reach out to this user to help resolve their issue.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} Alloro. Internal notification.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends error notification to Alloro team via n8n webhook
 */
export async function sendErrorNotificationEmail({
  userEmail,
  auditId,
  errorMessage,
  practiceInfo,
}: ErrorNotificationParams): Promise<void> {
  const emailBody = generateErrorNotificationHTML({
    userEmail,
    auditId,
    errorMessage,
    practiceInfo,
  });

  const payload = {
    cc: [],
    bcc: [],
    body: emailBody,
    from: "info@getalloro.com",
    subject: `⚠️ Audit Failed - User Needs Help: ${userEmail}`,
    fromName: "Alloro Alerts",
    recipients: ["info@getalloro.com"],
  };

  try {
    const response = await fetch(N8N_EMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Email service responded with status: ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();
      console.log("Error notification sent successfully:", result);
    } else {
      console.log("Error notification sent successfully (no JSON response)");
    }
  } catch (error) {
    console.error("Failed to send error notification:", error);
    throw new Error("Failed to send notification. Please try again.");
  }
}
