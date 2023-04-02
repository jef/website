import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    InternalServerErrorException,
    ServiceUnavailableException,
    UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';
import { SteamFriendData, SteamUserSummaryData } from '@modules/steam/steam.interface';
import * as AppTicket from 'steam-appticket';

@Injectable()
export class SteamService {
    constructor(private readonly http: HttpService, private readonly config: ConfigService) {
        this.steamApiKey = this.config.get('steam.webAPIKey');
        this.steamTicketsSecretKey = this.config.get('steam.ticketsSecretKey');
    }

    private readonly steamApiKey: string;
    private readonly steamTicketsSecretKey: string;

    /**
     * Handler for ISteamUser/GetPlayerSummaries/v2/
     */
    async getSteamUserSummaryData(steamID: string): Promise<SteamUserSummaryData> {
        const getPlayerResponse = await lastValueFrom(
            this.http
                .get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/', {
                    params: {
                        key: this.config.get('steam.webAPIKey'),
                        steamids: steamID
                    }
                })
                .pipe(map((res) => res.data))
        );

        const userSummary = getPlayerResponse.response?.players?.[0];

        if (
            !userSummary ||
            getPlayerResponse.response.error ||
            !userSummary.personaname === undefined ||
            !userSummary.avatarhash
        )
            throw new InternalServerErrorException('Failed to get player summary');

        return userSummary;
    }

    /**
     * Handler for ISteamUser/GetFriendList/v1/
     */
    async getSteamFriends(steamID: string): Promise<SteamFriendData[]> {
        const response = await lastValueFrom(
            this.http
                .get('https://api.steampowered.com/ISteamUser/GetFriendList/v1/', {
                    params: {
                        key: this.steamApiKey,
                        steamID: steamID,
                        relationship: 'friend'
                    }
                })
                .pipe(
                    catchError((_) => {
                        throw new ServiceUnavailableException('Failed to retrieve friends list from steam');
                    })
                )
        );

        if (!response.data) throw new InternalServerErrorException('Failed to get Steam friends list');

        return response.data.friendslist.friends;
    }

    /**
     * Handler for ISteamUserAuth/AuthenticateUserTicket/v1/
     * Try to decrypt a player's app ticket from ingame using the Steam API.
     * Returns SteamID if successful, throws otherwise.
     * @returns SteamID
     */
    // TODO: Test with debug build!!
    async tryAuthenticateUserTicketOnline(ticket: string, appID: number): Promise<string> {
        const steamResponse = await lastValueFrom(
            this.http
                .get('https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/', {
                    params: {
                        key: this.config.get('steam.webAPIKey'),
                        appid: appID,
                        ticket: ticket
                    }
                })
                .pipe(map((res) => res.data))
                .pipe(
                    catchError((_) => {
                        throw new ServiceUnavailableException('Failed to authenticate user with Steam');
                    })
                )
        );

        if (
            !steamResponse ||
            steamResponse.response.error ||
            steamResponse.response.params.result !== 'OK' ||
            !steamResponse.response.params.steamid
        )
            throw new UnauthorizedException('Invalid user ticket');

        return steamResponse.response.params.steamid;
    }

    /**
     * Try to decrypt a player's app ticket from ingame using the steam-appticket library.
     * Returns SteamID if successful, throws otherwise.
     *
     * Please note, the steam.ticketsSecretKey key is only available to app publishers on Steam, so Momentum's
     * will never be available to developers. For development using live Steam services, use the online API.
     */
    tryAuthenticateUserTicketLocal(ticket: Buffer): { steamID: string; appID: number } {
        const decrypted = AppTicket.parseEncryptedAppTicket(ticket, this.steamTicketsSecretKey);

        if (decrypted) return decrypted.steamID.getSteamID64();
        else throw new UnauthorizedException('Invalid user ticket');
    }

    /**
     * Checks whether a Steam account is in "limited" mode i.e. hasn't spent $5 or more on Steam. Unfortunately Steam
     * Web API doesn't return this, so we have to use this messier method of parsing the profile page as XML.
     */
    isAccountLimited(steamID: string): Promise<boolean> {
        return lastValueFrom(
            this.http
                .get(`https://steamcommunity.com/profiles/${steamID}?xml=1`)
                .pipe(map((res) => /(?<=<isLimitedAccount>)\d(?=<\/isLimitedAccount>)/.exec(res.data)[0] === '1'))
        );
    }
}
