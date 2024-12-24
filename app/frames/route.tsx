import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL, formatNumber } from "../utils";

interface State {
  lastFid?: string;
}

interface MoxieData {
  today: { allEarningsAmount: string };
  weekly: { allEarningsAmount: string };
  lifetime: { allEarningsAmount: string };
}

const frameHandler = frames(async (ctx) => {
  interface UserData {
    name: string;
    username: string;
    fid: string;
    socialCapitalScore: string;
    socialCapitalRank: string;
    profileDisplayName: string;
    isPowerUser: boolean;
    profileImageUrl: string;
  }

  let userData: UserData | null = null;
  let moxieData: MoxieData | null = null;

  let error: string | null = null;
  let isLoading = false;

  const fetchUserData = async (fid: string) => {
    isLoading = true;
    try {
      const airstackUrl = `${appURL()}/api/farscore?userId=${encodeURIComponent(
        fid
      )}`;
      const airstackResponse = await fetch(airstackUrl);
      if (!airstackResponse.ok) {
        throw new Error(
          `Airstack HTTP error! status: ${airstackResponse.status}`
        );
      }
      const airstackData = await airstackResponse.json();

      if (
        airstackData.userData.Socials.Social &&
        airstackData.userData.Socials.Social.length > 0
      ) {
        const social = airstackData.userData.Socials.Social[0];
        userData = {
          name: social.profileDisplayName || social.profileName || "Unknown",
          username: social.profileName || "unknown",
          fid: social.userId || "N/A",
          profileDisplayName: social.profileDisplayName || "N/A",
          socialCapitalScore:
            social.socialCapital?.socialCapitalScore?.toFixed(2) || "N/A",
          socialCapitalRank: social.socialCapital?.socialCapitalRank || "N/A",
          isPowerUser: social.isFarcasterPowerUser || false,
          profileImageUrl:
            social.profileImageContentValue?.image?.extraSmall ||
            social.profileImage ||
            "",
        };
      } else {
        throw new Error("No user data found");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      error = (err as Error).message;
    } finally {
      isLoading = false;
    }
  };

  const fetchMoxieData = async (fid: string) => {
    try {
      const moxieUrl = `${appURL()}/api/moxie-earnings?entityId=${encodeURIComponent(
        fid
      )}`;
      const moxieResponse = await fetch(moxieUrl);
      if (!moxieResponse.ok) {
        throw new Error(`Moxie HTTP error! status: ${moxieResponse.status}`);
      }
      moxieData = await moxieResponse.json();
    } catch (err) {
      console.error("Error fetching Moxie data:", err);
      error = (err as Error).message;
    }
  };

  const extractFid = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      let fid = parsedUrl.searchParams.get("userfid");

      console.log("Extracted FID from URL:", fid);
      return fid;
    } catch (e) {
      console.error("Error parsing URL:", e);
      return null;
    }
  };

  let fid: string | null = null;

  if (ctx.message?.requesterFid) {
    fid = ctx.message.requesterFid.toString();
    console.log("Using requester FID:", fid);
  } else if (ctx.url) {
    fid = extractFid(ctx.url.toString());
    console.log("Extracted FID from URL:", fid);
  } else {
    console.log("No ctx.url available");
  }

  if (!fid && (ctx.state as State)?.lastFid) {
    fid = (ctx.state as State).lastFid ?? null;
    console.log("Using FID from state:", fid);
  }

  //console.log("Final FID used:", fid);

  const shouldFetchData =
    fid && (!userData || (userData as UserData).fid !== fid);

  if (shouldFetchData && fid) {
    await Promise.all([fetchUserData(fid), fetchMoxieData(fid)]);
  }

  const SplashScreen = () => (
    <img
      src="https://i.imgur.com/XqD31MV.png"
      tw="w-full h-full object-cover"
    />
  );

  const ScoreScreen = () => {
    return (
      <div tw="flex flex-col w-full h-screen">
        <img
            src="https://i.imgur.com/XvOoU48.png"
            tw="h-screen w-full"
        />
        <img
          src={userData?.profileImageUrl}
          alt="Profile"
          tw="w-25 h-25 rounded-3 absolute top-100 left-60"
        />
        <div tw="flex text-[35px] absolute top-102 left-95 text-black">{userData?.username}</div>
        <div tw="flex text-[26px] absolute top-115 left-95 text-black">FID: {userData?.fid}</div>
        <div tw="flex text-[44px] justify-end absolute top-133 right-66 text-[#FF0F15]">{formatNumber(parseFloat(moxieData?.today.allEarningsAmount || "0"))} Ⓜ️</div>
        <div tw="flex text-[44px] justify-end absolute top-155 right-66 text-[#FF0F15]">{formatNumber(parseFloat(moxieData?.weekly.allEarningsAmount || "0"))} Ⓜ️</div>
        <div tw="flex text-[44px] justify-end absolute top-177 right-66 text-[#FF0F15]">{formatNumber(parseFloat(moxieData?.lifetime.allEarningsAmount || "0"))} Ⓜ️</div>
        <div tw="flex text-[30px] justify-start w-full absolute bottom-5 left-5 text-black">@tieubochet.eth</div>
      </div>
    );
  };
  const shareText = encodeURIComponent(
    userData
      ? `Check your Moxie rewards, frame made by @tieubochet.eth`
      : "Check your Moxie rewards, frame made by @tieubochet.eth"
  );

  // Change the url here
  const shareUrl = `https://warpcast.com/~/compose?text=${shareText}&embeds[]=https://check-moxie-rewards-v2.vercel.app/frames${
    fid ? `?userfid=${fid}` : ""
  }`;

  const buttons = [];

  if (!userData) {
    buttons.push(
      <Button action="post" target={{ href: `${appURL()}?userfid=${fid}` }}>
        Check yours
      </Button>
    );
  } else {
    buttons.push(
      <Button action="post" target={{ href: `${appURL()}?userfid=${fid}` }}>
        Check yours
      </Button>,
      <Button action="link" target={shareUrl}>
        Share
      </Button>
    );
  }

  return {
    image: fid && !error ? <ScoreScreen /> : <SplashScreen />,
    buttons: buttons,
    imageOptions: {
      aspectRatio:"1:1",
    },
    title: "Moxie Earnings",
    description: "Use this frame to check your Moxie Earnings",
  };
});

export const GET = frameHandler;
export const POST = frameHandler;
